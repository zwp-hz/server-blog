const multer = require("multer");
const ALY = require("aliyun-sdk");
const storage = multer.memoryStorage();

const qn_config = {
  accessKey: "LjRF-xAdsuHVNVRZF06Hh_QbP5q3we_dkiDSPoWb",
  secretKey: "Ourm9REEBNiRv_MPssmIzsN-9Mmkwe0v9JCq-7XO",
  bucket: "images",
  uploadURL: "http://up-z1.qiniu.com"
};

const upload = multer({
  storage: storage,
  limits: {
    fieldSize: 20480 // 限制文件在20MB以内
  },
  fileFilter: function(req, files, callback) {
    // 只允许上传jpg|png|jpeg|gif格式的文件
    let type =
      "|" + files.mimetype.slice(files.mimetype.lastIndexOf("/") + 1) + "|";
    let fileTypeValid = "|jpg|png|jpeg|gif|".indexOf(type) !== -1;
    callback(null, !!fileTypeValid);
  }
});

const sendEmail = data => {
  if (process.env.NODE_ENV === "production") {
    
    const AccessKeyId = "";
    const AccessKeySecret = "";
    const DM = new ALY.DM({
      accessKeyId: AccessKeyId,
      secretAccessKey: AccessKeySecret,
      endpoint: "https://dm.aliyuncs.com",
      apiVersion: "2015-11-23"
    });

    let Subject = "",
      HtmlBody = "",
      userHtml = `${data.user_name}<span style="color: #7f7f7f;"><${
        data.email
      }></spam>`;

    if (data.acticle_title) {
      Subject = data.reply_email ? "评论回复" : "文章评论";

      if (data.reply_email) {
        HtmlBody = `<p>${userHtml}回复了你的评论。</p>
      <p>回复：${data.content}</p>`;
      } else {
        HtmlBody = `<p>${userHtml}评论了文章<a href="${data.url}">${
          data.acticle_title
        }</a>。</p>
      <p>评论：${data.content}</p>`;
      }
    } else {
      Subject = data.reply_email ? "留言回复" : "网站留言";

      if (data.reply_email) {
        HtmlBody = `<p>${userHtml}回复了你的留言。</p>
      <p>回复：${data.content}</p>`;
      } else {
        HtmlBody = `<p>${userHtml}留言了。</p>
      <p>留言：${data.content}</p>`;
      }
    }

    HtmlBody += `<p>点击链接查看：<a href="${data.url}">${data.url}</a></p>`;

    DM.singleSendMail(
      {
        AccountName: "admin@email.zhuweipeng.top",
        AddressType: 1,
        ReplyToAddress: true,
        FromAlias: "朱为鹏",
        HtmlBody: HtmlBody,
        ToAddress: data.reply_email || "1453928106@qq.com",
        Subject: Subject
      },
      (err, data) => {}
    );
  }
};

module.exports = {
  getInitials: code => getInitials(code),
  sendEmail,
  qn_config,
  upload
};
