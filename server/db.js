const mongoose = require("mongoose");
const Schema = mongoose.Schema;

mongoose.connect(
  "mongodb://127.0.0.1:27017/blog",
  { useMongoClient: true }
);

const userSchema = new Schema({
  username: String,
  password: String,
  token: String,
  creation_at: Number
});

const categorySchema = new Schema({
  name: String
});

const TagSchema = new Schema({
  name: String
});

const articleSchema = new Schema({
  title: String,
  describe: String,
  content: String,
  categories: Array,
  tags: Array,
  image_src: String,
  browsing: Number,
  release: Boolean,
  creation_at: Number,
  update_at: Number,
  comments: [
    {
      type: Schema.Types.ObjectId,
      ref: "comments"
    }
  ]
});

const commentSchema = new Schema({
  ip: String,
  article_id: String,
  reply_id: String,
  reply_user: String,
  content: String,
  user_name: String,
  email: String,
  city: String,
  avatar: String,
  replys: [
    {
      type: Schema.Types.ObjectId,
      ref: "comments"
    }
  ],
  creation_at: Number
});

module.exports = {
  User: mongoose.model("user", userSchema),
  Category: mongoose.model("categories", categorySchema),
  Tag: mongoose.model("tags", TagSchema),
  Article: mongoose.model("articles", articleSchema),
  Comment: mongoose.model("comments", commentSchema)
};
