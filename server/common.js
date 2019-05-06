const multer = require('multer');
const storage = multer.memoryStorage()

const qn_config = {
    accessKey: 'aw1tj0Z9rVwM2xo3ZbcO249Y6kdoZm7AS5NmQ2oG',
    secretKey: '-LA_F_5r1-tun9o2KIRzQdjE_t9DIzx7Uw81pd4p',
    bucket: 'images',
    uploadURL: 'http://up-z1.qiniu.com'
};

const upload = multer({
    storage: storage,
    limits: {
        fieldSize: 10240 // 限制文件在10MB以内
    },
    fileFilter: function(req, files, callback) {
        console.log(files)
        // 只允许上传jpg|png|jpeg|gif格式的文件
        var type = '|' + files.mimetype.slice(files.mimetype.lastIndexOf('/') + 1) + '|';
        var fileTypeValid = '|jpg|png|jpeg|gif|'.indexOf(type) !== -1;
        callback(null, !!fileTypeValid);
    }
});

module.exports = {
	getInitials: (code) => getInitials(code),
	qn_config,
	upload
};