const express = require("express");
const router = express.Router();
const request = require("request");
const db = require("./db");
const common = require("./common");
const parseString = require("xml2js").parseString;
const bodyParser = require("body-parser");

// 七牛资源管理
const qiniu = require("qiniu");
const qn = require("qn");
const upload = require("./common").upload;

var mac = new qiniu.auth.digest.Mac(
    common.qn_config.accessKey,
    common.qn_config.secretKey
  ),
  config = new qiniu.conf.Config();

config.zone = qiniu.zone.Zone_z0;
var bucketManager = new qiniu.rs.BucketManager(mac, config),
  bucket = common.qn_config.bucket;

// 对body进行解析
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

// 跨域配置
const url =
  process.env.NODE_ENV === "production" ? "http://www.zhuweipeng.top" : "*";

router.all("*", function(req, res, next) {
  origin =
    req.path === "/api/getWeather" || req.path === "/api/bing" ? "*" : url;

  if (
    origin === "*" ||
    (req.headers.origin && req.headers.origin.indexOf("zhuweipeng.top") != -1)
  ) {
    res.header("Access-Control-Allow-Origin", req.headers.origin);
    res.header("Access-Control-Allow-Credentials", true);
    res.header(
      "Access-Control-Allow-Headers",
      "Content-Type, Content-Length, Authorization, Accept, X-Requested-With , yourHeaderFeild"
    );
    res.header(
      "Access-Control-Allow-Methods",
      "PUT, POST, GET, DELETE, OPTIONS"
    );
  }
  next();
});

/**
 * 接口回调
 * @param {err}     错误信息
 * @param {res}     请求来源
 * @param {result}  第三方接口、mongodb请求 result
 * @param {data}    请求成功返回数据 {}
 * @param {message} 提示信息 ["登录成功"，"账号或密码不正确"，"请求失败"]
 */
const callback = (err, res, result, data, message) => {
  // 请求状态  0：请求成功  1：数据不存在  2：接口报错
  let status = err ? 2 : result ? 0 : 1;

  return res
    .status(status === 2 ? 500 : 200)
    .jsonp({
      code: status,
      data: status === 0 ? data : {},
      message: status === 2 ? err.message : message[status]
    })
    .end();
};

/**
 * 请求失败回调
 * @param {res}     请求来源
 * @param {message} 错误提示
 *
 * @return
 */
const errorCallback = (res, message = "请求失败") => {
  return res
    .status(200)
    .jsonp({
      code: 1,
      data: {},
      message: message
    })
    .end();
};

/**
 * 必应每日壁纸
 * @return {壁纸url}
 */
router.all("/api/bing", (req, res) => {
  let proxy_url = "http://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1";
  let options = {
    url: proxy_url,
    headers: { Connection: "close" },
    method: "GET",
    json: true
  };

  request(options, (err, result, data) => {
    callback(err, res, result, data, ["获取图片成功", "数据有误"]);
  });
});

/**
 * 获取天气信息
 * @param {req}     请求相关信息  用于获取请求网络的ip
 * @return {当前城市的天气信息}
 */
router.all("/api/getWeather", (req, res) => {
  let ip = req.headers["x-real-ip"]
    ? req.headers["x-real-ip"]
    : req.ip.replace(/::ffff:/, "");

  ip = ip === "::1" ? "115.236.163.114" : ip;

  getCityInfo(ip, res);
});

/**
 * 获取分类列表
 * @return {分类列表}
 */
router.post("/api/getCategoryList", (req, res) => {
  db.Category.find((err, result) => {
    callback(err, res, result, result, ["获取列表成功", "数据有误"]);
  });
});

/**
 * 获取标签列表
 * @return {标签列表}
 */
router.post("/api/getTagsList", (req, res) => {
  db.Tag.find((err, result) => {
    callback(err, res, result, result, ["获取列表成功", "数据有误"]);
  });
});

/**
 * 删除评论
 * @param {articleId}   文章id
 * @param {commentId}   评论id
 */
// router.post("/api/deleteComment", (req, res) => {
//   let articleId = req.body.articleId,
//     commentId = req.body.commentId;

//   db.Comment.remove({ _id: commentId }, err => {
//     if (!err) {
//       db.Article.update(
//         { _id: articleId },
//         { $pull: { review: commentId } },
//         (error, result) => {
//           callback(error, res, result, {}, ["删除成功", "删除失败"]);
//         }
//       );
//     }
//   });
// });

/**
 * 发表评论
 * @param {content}     内容
 * @param {nickname}    昵称
 * @return {status}
 */
// router.post("/api/setComment", (req, res) => {
//   let ip = req.headers["x-real-ip"]
//     ? req.headers["x-real-ip"]
//     : req.ip.replace(/::ffff:/, "");
//   ip = ip === "::1" ? "115.236.163.114" : ip;

//   getCityInfo(ip, res, cityInfo => {
//     let data = {
//       article_id: req.body.id,
//       content: req.body.content,
//       nickname: req.body.nickname,
//       ip: ip,
//       city: cityInfo.region + " " + cityInfo.city,
//       creation_at: Date.parse(new Date())
//     };

//     let comment = new db.Comment(data);

//     if (!req.body.content) {
//       errorCallback(res, "评论内容不能为空！");
//     }

//     comment.save((err, result) => {
//       if (!err) {
//         db.Article.update(
//           { _id: req.body.id },
//           {
//             $addToSet: {
//               review: result._id
//             }
//           },
//           error => {
//             callback(error, res, result, result, ["评论成功", "评论失败"]);
//           }
//         );
//       }
//     });
//   });
// });

/**
 * 登录验证
 * @param {token}   token
 * @return {status}
 */
router.post("/api/isLogin", (req, res) => {
  db.User.findOne({ token: req.body.token }, (err, result) => {
    callback(err, res, result, result, ["获取成功", "用户不存在"]);
  });
});

/**
 * 登录
 * @param {username}    用户名
 * @param {password}    密码
 * @return {status}
 */
router.post("/api/login", (req, res) => {
  db.User.findOne(
    { username: req.body.username, password: req.body.password },
    (err, result) => {
      callback(err, res, result, { token: result.token }, [
        "登录成功",
        "账号或密码不正确"
      ]);
    }
  );
});

/**
 * 七牛图片上传
 * @return {status}
 */
router.post("/api/upload", (req, res, next) => {
  // 七牛相关配置信息
  let client = qn.create(common.qn_config);

  // 上传单个文件
  upload.single("file")(req, res, err => {
    if (err) {
      return console.error(err);
    }
    if (req.file && req.file.buffer) {
      // 上传到七牛
      client.upload(
        req.file.buffer,
        {
          key: req.file.originalname
        },
        (err, result) => {
          callback(err, res, result, {}, ["上传成功", "上传失败"]);
        }
      );
    }
  });
});

/**
 * 获取七牛资源列表
 * @param {prefix}   文件前缀
 * @param {limit}    返回的最大文件数量
 * @param {type}     区分是否添加指定目录分隔符。  默认为false
 */
router.post("/api/getQiniuList", (req, res) => {
  let options = req.body.type ? { delimiter: ":" } : {},
    prefix = req.body.prefix;

  bucketManager.listPrefix(
    bucket,
    Object.assign(options, req.body),
    (err, respBody, respInfo) => {
      if (respBody.commonPrefixes) {
        respBody.commonPrefixes.forEach((item, i) => {
          respBody.commonPrefixes[i] = item.replace(prefix, "");
        });
      }

      respBody.items.reverse().forEach((item, i) => {
        respBody.items[i].img_name = item.key.replace(prefix, "");
      });

      callback(err, res, respInfo, respBody, ["获取资源成功", respBody, err]);
    }
  );
});

/**
 * 删除七牛对应空间中的文件
 * @param {key} 文件名
 */
router.post("/api/delete_qiniu", (req, res) => {
  let key = req.body.key;

  bucketManager.delete(bucket, key, (err, respBody, respInfo) => {
    callback(err, res, respInfo, respBody, ["删除成功", respBody, err]);
  });
});

/**
 * 添加、编辑、删除文章
 * @param {_id}         文章id (编辑标示)
 * @param {title}       标题
 * @param {categories}  类别
 * @param {tags}        标签
 * @param {image_src}   封面图
 * @param {content}     文章内容
 * @param {type}        操作类型  save：添加。 update：编辑。 remove：删除。
 * @return {status}
 */
router.post("/api/operateArticles", (req, res) => {
  let type = req.body.type,
    _id = req.body._id,
    newData = req.body;

  delete newData._id;

  let updataTag = () => {
    if (type !== "删除") {
      newData.categories.map(item => {
        db.Category.update(
          { name: item },
          { $set: { name: item } },
          { upsert: true },
          (err, result) => {
            if (err) callback(err, res, result, {}, ["", "", "更新分类失败"]);
          }
        );
      });

      newData.tags.map(item => {
        db.Tag.update(
          { name: item },
          { $set: { name: item } },
          { upsert: true },
          (err, result) => {
            if (err) callback(err, res, result, {}, ["", "", "更新标签失败"]);
          }
        );
      });
    }
  };

  if (type === "update") {
    newData.update_at = Date.parse(new Date());
    db.Article.findOneAndUpdate({ _id: _id }, newData, (err, result) => {
      if (!err) updataTag();
      callback(err, res, result, {}, ["更新成功", "数据有误"]);
    });
  } else if (type === "save") {
    newData.creation_at = Date.parse(new Date());
    newData.browsing = 0;
    let article = new db.Article(newData);
    article.save((err, result) => {
      if (!err) updataTag();
      callback(err, res, result, {}, ["添加成功", "数据有误"]);
    });
  } else if (type === "remove") {
    db.Article.findByIdAndRemove(_id, (err, result) => {
      callback(err, res, result, {}, ["删除成功", "数据有误"]);
    });
  }
});

/**
 * 获取文章列表
 * @param {categories}  类别
 * @param {searchCnt}   搜索内容
 * @param {release}     用于草稿文章的显示隐藏  false：显示  true：隐藏 默认为false
 * @param {type}        categories: "文章类别"
 * @param {page}        第几页 默认为1
 * @param {per_page}    每页个数 默认为10
 * @return {文章列表}
 */
router.post("/api/getArticlesList", (req, res) => {
  let categories = req.body.categories, // 文章类别
    searchCnt = req.body.searchCnt, // 文章搜索内容
    per_page = Number(req.body.per_page || 12), // 每页个数
    page = Number(req.body.page || 1), // 获取第几页文章列表
    type = req.body.type || "", // 请求类型
    criteria = req.body.release ? { release: req.body.release } : {}, // 查询条件
    fields = {}, // 控制返回的字段
    options = { sort: { browsing: -1 }, limit: per_page }, // 控制选项
    reg = new RegExp(searchCnt, "i"), // 搜索正则匹配
    hots = []; // 热门文章列表

  if (categories && categories != "全部") {
    criteria.categories = { $in: [categories] };
    options.skip = (page - 1) * per_page;
  } else {
    options.skip = (page - 1) * per_page;
  }

  // 搜索条件设置
  if (searchCnt) {
    criteria.$or = [
      { title: { $regex: reg } },
      { describe: { $regex: reg } },
      { categories: { $in: [searchCnt] } },
      { tags: { $in: [searchCnt] } }
    ];
  }

  // 获取热门文章
  db.Article.find(
    { release: req.body.release },
    { title: 1, image_src: 1, categories: 1, review: 1 },
    { sort: { update_at: -1 }, limit: 3 },
    (error, result) => {
      hots = result;
    }
  );

  new Promise((resolve, reject) => {
    // 获取文章总数
    db.Article.count(criteria, (error, countNum) => {
      if (!error) {
        resolve(countNum);
      } else {
        reject();
      }
    });
  })
    .then(num => {
      // 获取全部文章列表
      // .populate("review")  根据id 获取关联的评论数据
      db.Article.find(criteria, fields, options).exec((err, result) => {
        callback(
          err,
          res,
          result,
          {
            current_page: page,
            data: req.body.release
              ? {
                  hots: hots,
                  list: result
                }
              : result,
            last_page: Math.ceil(num / per_page)
          },
          ["获取列表成功", "获取列表失败"]
        );
      });
    })
    .catch(() => {
      errorCallback(res, "获取文章总数失败!");
    });
});

/**
 * 获取文章详情
 * @param {_id}         文章id（用于获取文章详情）
 * @param {type}        edit: '后台查看  不计入浏览器次数',
 * @return {detail}
 */
router.post("/api/getArticlesDetail", (req, res) => {
  let _id = req.body._id,
    criteria = req.body.release ? { release: req.body.release } : {}; // 查询条件

  criteria._id = _id;
  if (req.body.type !== "edit") {
    db.Article.update(criteria, { $inc: { browsing: 1 } }, () => {});
  }

  new Promise((resolve, reject) => {
    // 获取热门文章
    db.Article.find(
      { release: req.body.release },
      { title: 1, image_src: 1, categories: 1, review: 1 },
      { sort: { update_at: -1 }, limit: 3 },
      (error, result) => {
        resolve(result);
      }
    );
  }).then(hots => {
    db.Article.findOne(criteria).exec((err, result) => {
      callback(
        err,
        res,
        result,
        req.body.type === "edit"
          ? result
          : {
              hots: hots,
              data: result
            },
        ["获取详情成功", "获取详情失败"]
      );
    });
  });
});

/**
 * 获取天气信息
 * @param {cityInfo}  城市信息
 * @param {res}       请求来源
 */
const getWeatherInfo = (cityInfo, res) => {
  let weather_server = "http://wthrcdn.etouch.cn/WeatherApi?citykey=",
    weatherJson = {};

  request(
    {
      url: weather_server + common.cityKey[cityInfo.region][cityInfo.city],
      headers: { Connection: "close" },
      method: "GET",
      gzip: true
    },
    (error, response, data) => {
      if (response && response.statusCode == 200) {
        parseString(data, function(err, result) {
          weatherJson = result.resp;
        });

        if (weatherJson.error) {
          errorCallback(res, weatherJson.error);
          return false;
        } else {
          //天气添加汉字拼音
          weatherJson.forecast.forEach((item, i) => {
            item.weather.forEach((items, j) => {
              for (var y in items) {
                if (y == "day" || y == "night") {
                  items[y][0]["type_py"] = common.getInitials(
                    items[y][0].type[0]
                  );
                }
              }
            });
          });
          weatherJson.time = new Date().getTime();
        }
      }

      callback(error, res, response, weatherJson, [
        "获取天气成功",
        "获取天气失败"
      ]);
    }
  );
};

/**
 * 获取城市信息
 * @param {ip}        请求的ip地址
 * @param {res}       请求来源
 * @param {fn}        回调函数
 */
const getCityInfo = (ip, res, fn) => {
  let options = {
    url: "http://ip.taobao.com/service/getIpInfo.php?ip=" + ip,
    headers: { Connection: "close" },
    method: "GET",
    json: true
  };

  request(options, (err, result, data) => {
    if (!err && data.code === 0) {
      if (fn) {
        fn(data.data);
      } else {
        getWeatherInfo(data.data, res);
      }
    } else {
      errorCallback(res, "获取城市失败");
    }
  });
};

module.exports = router;
