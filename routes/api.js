/*
 *
 *
 *       Complete the API routing below
 *
 *
 */

"use strict";

var expect = require("chai").expect;
var mongoose = require("mongoose");

// option to use FindOneAndUpdate
mongoose.set("useFindAndModify", false);
// database setup
const CONNECTION_STRING = process.env.DB;
// Schema
var Schema = mongoose.Schema;
// Board Schema
var boardSchema = new Schema({
  board: { type: String, required: true },
  text: { type: String, required: true },
  created_on: { type: Date, required: true },
  bumped_on: { type: Date, required: true },
  reported: { type: Boolean, required: false },
  delete_password: { type: String, required: true },
  replies: [
    {
      _id: { type: mongoose.Schema.Types.ObjectId, required: true },
      text: { type: String, required: true },
      created_on: { type: Date, required: true },
      delete_password: { type: String, required: true },
      reported: { type: Boolean, required: false }
    }
  ]
});
//Models
var BoardModel = mongoose.model("board", boardSchema);

module.exports = function(app) {
  mongoose.connect(CONNECTION_STRING, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  //thread routes
  //create a new thread
  let threadRoute = "/api/threads/:board";
  app.route(threadRoute).post(async function(req, res) {
    let board = req.body.board;
    let text = req.body.text;
    let passDelete = req.body.delete_password;
    let newBoard = new BoardModel({
      board: board,
      text: text,
      created_on: new Date().toUTCString(),
      bumped_on: new Date().toUTCString(),
      reported: false,
      delete_password: passDelete,
      replies: []
    });
    newBoard.save(function(err) {
      if (err) {
        console.warn(err);
      } else {
        res.redirect("/b/" + board);
      }
    });
  });
  //report a thread
  app.route(threadRoute).put(async function(req, res) {
    let id = req.body.thread_id;
    let foundBoard = await BoardModel.findById(id, function(err, doc) {
      if (err) {
        console.warn(err);
      } else {
        return doc;
      }
    });
    if (id === foundBoard._id.toString()) {
      BoardModel.findByIdAndUpdate(id, { reported: true }, function(err, doc) {
        if (err) {
          console.warn(err);
        } else {
          res.json("success");
        }
      });
    } else {
      res.json("incorrect board information, please review");
    }
  });
  //delete a thread
  app.route(threadRoute).delete(async function(req, res) {
    let board = req.body.board;
    let id = req.body.thread_id;
    let pass = req.body.delete_password;
    let reqPass = (await BoardModel.find({ _id: id }))[0].delete_password;
    //if the delete password doesn't match the entered password, nothing happens
    if (reqPass !== pass) {
      res.json("incorrect password");
    } else {
      BoardModel.findByIdAndDelete(id, function(err, doc) {
        if (err) {
          console.warn(err);
        } else {
          res.json("success");
        }
      });
    }
  });

  //get the most 10 recently bumped threads and their 3 most recent replies
  app.route(threadRoute).get(async function(req, res) {
    //a container array we're going to show to the user
    let query = [];
    //the query will handle the response to the user as well
    //I also excluded the fields in the replies
    BoardModel.find(
      {},
      "-delete_password -board -reported -__v -replies.delete_password -replies.reported"
    )
      .sort({ bumped_on: "desc" })
      .limit(10)
      .exec(function(err, doc) {
        if (err) {
          console.warn(err);
        } else {
          for (let i = 0; i < doc.length; i++) {
            let replyLength = doc[i].replies.length;
            if (replyLength > 3) {
              query.push({
                _id: doc[i]._id,
                text: doc[i].text,
                created_on: doc[i].created_on,
                bumped_on: doc[i].bumped_on,
                replies: doc[i].replies.slice(replyLength - 3)
              });
            }else{
              query.push(doc[i]);
            }
          }
          res.json(query);
        }
      });
  });

  //reply routes
  let replyRoute = "/api/replies/:board";
  //making a new reply
  app.route(replyRoute).post(async function(req, res) {
    let board = req.body.board;
    let threadId = req.body.thread_id;
    let text = req.body.text;
    let pass = req.body.delete_password;
    let replyId = mongoose.Types.ObjectId();
    //making it much neater to add in the new reply by making an object in advance
    let newReply = {
      _id: replyId,
      text: text,
      created_on: new Date().toUTCString(),
      delete_password: pass,
      reported: false
    };
    //updating the bumped on date of the board to the date of the reply and adding the new reply
    BoardModel.updateOne(
      { _id: threadId },
      { $push: { replies: newReply } },
      function(err, doc) {
        if (err) {
          console.warn(err);
        }
      }
    );
    BoardModel.findByIdAndUpdate(
      threadId,
      { bumped_on: new Date().toUTCString() },
      function(err, doc) {
        if (err) {
          console.warn(err);
        } else {
          res.redirect("/b/" + board + "/" + threadId);
        }
      }
    );
  });

  //reporting a reply
  app.route(replyRoute).put(async function(req, res) {
    let board = req.body.board;
    let threadId = req.body.thread_id;
    let replyId = req.body.reply_id;

    BoardModel.findOneAndUpdate(
      { _id: threadId, replies: { $elemMatch: { _id: replyId } } },
      { $set: { "replies.$.reported": true } },
      function(err, doc) {
        if (err) {
          console.warn(err);
        } else {
          res.json("success");
        }
      }
    );
  });

  //delete a reply
  app.route(replyRoute).delete(async function(req, res) {
    let board = req.body.board;
    let threadId = req.body.thread_id;
    let replyId = req.body.reply_id;
    let pass = req.body.delete_password;
    let replArr = (await BoardModel.findOne({ _id: threadId }, function(
      err,
      doc
    ) {
      if (err) {
        console.warn(err);
      } else {
        return doc;
      }
    })).replies;
    for (let i = 0; i < replArr.length; i++) {
      if (
        replArr[i]._id.toString() === replyId &&
        replArr[i].delete_password === pass
      ) {
        var match = replArr[i];
        break;
      }
    }
    if (match) {
      BoardModel.findOneAndUpdate(
        {
          _id: threadId,
          replies: { $elemMatch: { _id: replyId, delete_password: pass } }
        },
        { $set: { "replies.$.text": "[deleted]" } },
        function(err, doc) {
          if (!err) {
            res.json("success");
          }
        }
      );
    } else {
      res.json("incorrect password");
    }
  });

  //get replies
  app.route(replyRoute).get(async function(req, res) {
    //this was a bit more simple than the boards
    let threadId = req.query.thread_id;
    BoardModel.findById(
      threadId,
      "-delete_password -reported -__v -replies.delete_password -replies.reported"
    ).exec(function(err, doc) {
      if (err) {
        console.warn(err);
      } else {
        res.json(doc);
      }
    });
  });
};
