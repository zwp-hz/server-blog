const express = require('express');
const router = express.Router();
const request = require('request');
const http = require('http');
const db = require('./db');
const common = require('./common');
const parseString = require('xml2js').parseString;

/**
 * 必应每日壁纸
 * @return {壁纸url}
 */
router.get('/api/bing', (req,res) => {
	let proxy_url = 'http://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1';
  	let options = {
        url: proxy_url,
        headers: {"Connection": "close"},
        method: "GET",
        json: true
  	};

	request(options, (error, response, data) => {
		if (!error && response && response.statusCode == 200) {
			let imgs = "http://www.bing.com/" + data.images[0].url;

	        return res.status(200).jsonp({code: 0,data: imgs,message: "成功"}).end();
	    }
	});
});

/**
 * 获取天气信息
 * @param {req} 		请求相关信息  用于获取请求网络的ip
 * @return {当前城市的天气信息}
 */
router.get('/api/getWeather',(req,res) => {
    var ip = req.headers['x-real-ip'] ? req.headers['x-real-ip'] : req.ip.replace(/::ffff:/, '');
    ip = "115.236.163.114";

	getWeatherInfo(ip, function(err, msg) {
	    if (err) {
	    	return res.status(200).jsonp({code: 1,data: [],message: err}).end();
	    } else {
	    	return res.status(200).jsonp({code: 0,data: msg,message: "成功"}).end();
	    }
	})
})

/**
 * 获取分类列表
 * @return {分类列表}
 */
router.get('/api/getCategoryList', (req,res) => {
	db.Category.find((err, doc) => {
		if (doc) {
			return res.status(200).jsonp({code: 0,data: doc,message: "成功"}).end();
	    }else {
	    	return res.status(500).jsonp({code: 1,data: [],message: "请求有误"}).end();
	    }
	})
})

/**
 * 获取标签列表
 * @return {标签列表}
 */
router.get('/api/getTagsList', (req,res) => {
	db.Tag.find((err, doc) => {
		if (doc) {
			return res.status(200).jsonp({code: 0,data: doc,message: "成功"}).end();
	    }else {
	    	return res.status(500).jsonp({code: 1,data: [],message: "请求有误"}).end();
	    }
	})
})

/**
 * 获取文章列表
 * @param {_id} 			文章id	（用于获取文章详情）
 * @param {categories} 		类别
 * @param {searchCnt} 		搜索内容
 * @param {type} 			hot: "最新更改文章", categories: "文章类别"
 * @param {page} 			第几页 默认为1
 * @param {per_page} 		没页个数 默认为10
 * @return {文章列表}
 */
router.get('/api/getArticlesList', (req,res) => {
	let per_page = Number(req.param("per_page") || 10), 
		countNum = 0,	//文章总数
		criteria = {}, fields = {}, options = {sort: {browsing: -1},limit: per_page},
		categories = req.param("categories"),
		searchCnt = req.param("searchCnt"),
		_id = req.param("_id"),
		reg = new RegExp(searchCnt, 'i'),
		page = Number(req.param("page") || 1);

	if (_id) {
		criteria = {_id: _id};
		//增加访问数
		db.Article.update(criteria,{$inc: {browsing: 1}},(err, doc) => {});
	} else if (req.param("type") === "hot") {
		fields = {title: 1,images_src: 1,categories: 1,review: 1};
		options = {sort: {'update_at': -1},limit: 3};
	} else if (categories && categories != "全部") {
		criteria = {categories: {$in: [categories]}};
		options.skip = (page - 1) * per_page;
	} else {
		options.skip = (page - 1) * per_page;
	}

	if (searchCnt) {
		criteria.$or = [
			{title: {$regex: reg}},
			{categories: {$in: [searchCnt]}}
		];
	}

	//获取文章
	db.Article.count(criteria,(err, doc) => {
		countNum = doc;

		db.Article.find(criteria,fields,options,(error, data) => {
			if (data) {
				return res.status(200).jsonp({code: 0,data: {
					current_page: page,
					data: data,
					last_page: Math.ceil(countNum / per_page)
				},message: "成功"}).end();
		    }else {
		    	return res.status(500).jsonp({code: 1,data: [],message: "请求有误"}).end();                                                                                                                                                                                                                                                                                                                                       
		    }
		})
	})
})

/**
 * 获取天气信息
 * @param {id} 			请求的ip地址
 * @param {fn} 			回调函数
 */
let getWeatherInfo = (ip, fn) => {
    let sina_server = 'http://int.dpool.sina.com.cn/iplookup/iplookup.php?format=json&ip=' + ip,
    	weather_server = 'http://wthrcdn.etouch.cn/WeatherApi?citykey=',
    	weatherJson = {};

    http.get(sina_server, (res) => {
        if (res && res.statusCode == 200) {
            res.on('data', function(data) {
                try {
                	let param = JSON.parse(data);

                	request({
				        url: weather_server + common.cityKey[param.province][param.city],
				        headers: {"Connection": "close"},
				        method: "GET",
				        gzip: true
				  	},(error, response, data) => {
				  		if (!error && response && response.statusCode == 200) {
				  			
				  			parseString(data, function (err, result) {
				  				weatherJson = result.resp;
							});

				  			//天气添加汉字拼音
				  			weatherJson.forecast.forEach((item,i) => {
				  				item.weather.forEach((items,j) => {
				  					for (var y in items) {

				  						if (y == "day" || y == "night") {
				  							items[y][0]["type_py"] = common.getInitials(items[y][0].type[0]);
				  						}
				  					}
				  				});
				  			});

				  			weatherJson.time = new Date().getTime();

				  			fn(error,weatherJson)
				  		} else {
				  			fn(error);
				  		}
				  	});
                } catch (err) {
                    fn(err);
                }
            });
        } else {
            fn({ code: code });
        }
    }).on('error', (e) => { fn(e); });
};

module.exports = router;