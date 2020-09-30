/*
 *
 *
 *       FILL IN EACH FUNCTIONAL TEST BELOW COMPLETELY
 *       -----[Keep the tests in the same order!]-----
 *       (if additional are added, keep them at the very end!)
 */

var chaiHttp = require("chai-http");
var chai = require("chai");
var assert = chai.assert;
var server = require("../server");

chai.use(chaiHttp);
let threadId, replyId, replyBoardId;
let deleteReply = "chai";

suite("Functional Tests", function() {
    suite("API ROUTING FOR /api/threads/:board", function() {
      suite("POST", function() {
        test("Creating a board and then redirecting the user", function(done) {
          chai
            .request(server)
            .post("/api/threads/:board")
            .send({
              board: "chaiThread",
              text: "A chai test",
              delete_password: "testing"
            })
            .end(function(err, res) {
              let ip = res.redirects[0].substr(0, res.redirects[0].indexOf("/b"));
              assert.equal(res.status, 200);
              assert.equal(res.redirects[0], ip + "/b/chaiThread");
              done();
            });
        });
      });

      suite("GET", function() {
        test("Get the 10 most recently bumped threads with 3 replies", function(done) {
          chai
            .request(server)
            .get("/api/threads/:board")
            .end((err, res) => {
              let example = res.body[0];
              threadId = res.body[0]._id;
              assert.equal(res.status, 200);
              assert.isArray(res.body);
              assert.isAtMost(res.body.length, 10);
              assert.isArray(example.replies);
              assert.isAtMost(example.replies.length, 3);
              assert.property(example, "_id");
              assert.property(example, "text");
              assert.property(example, "created_on");
              assert.property(example, "bumped_on");
              assert.property(example, "replies");
              assert.notProperty(example, "reported");
              assert.notProperty(example, "delete_password");
              done();
            });
        });
      });
      suite("PUT", function() {
        test("Reporting a thread", function(done) {
          chai
            .request(server)
            .put("/api/threads/:board")
            .send({ thread_id: threadId })
            .end((err, res) => {
              assert.equal(res.status, 200);
              assert.equal(res.text, '"success"');
              done();
            });
        });
      });

      suite("DELETE", function() {
        test("Deleting with an incorrect password", function(done) {
          chai
            .request(server)
            .delete("/api/threads/:board")
            .send({ thread_id: threadId, delete_password: "wrong pass" })
            .end((err, res) => {
              assert.equal(res.status, 200);
              assert.equal(res.text, '"incorrect password"');
              done();
            });
        });
        test("Deleting with a correct password", function(done) {
          chai
            .request(server)
            .delete("/api/threads/:board")
            .send({ thread_id: threadId, delete_password: "testing" })
            .end((err, res) => {
              assert.equal(res.status, 200);
              assert.equal(res.text, '"success"');
              done();
            });
        });
      });
    });

  suite("API ROUTING FOR /api/replies/:board", function() {
    suite("New Board for Tests", function() {
      test("Creating a test board", function(done) {
        chai
          .request(server)
          .post("/api/threads/:board")
          .send({
            board: "chaiReply",
            text: "A chai test",
            delete_password: "testing"
          })
          .end(function(err, res) {
            let ip = res.redirects[0].substr(0, res.redirects[0].indexOf("/b"));
            assert.equal(res.status, 200);
            assert.equal(res.redirects[0], ip + "/b/chaiReply");
            done();
          });
      });
      test("Getting the new board id", function(done) {
        chai
          .request(server)
          .get("/api/threads/:board")
          .end((err, res) => {
            replyBoardId = res.body[0]._id;
            assert.equal(res.status, 200);
            assert.isArray(res.body);
            assert.isArray(res.body[0].replies);
            assert.isAtMost(res.body.length, 10);
            done();
          });
      });
    });
    suite("POST", function() {
      test("New reply posted to a board", function(done) {
        chai
          .request(server)
          .post("/api/replies/:board")
          .send({
            board: "chaiReply",
            thread_id: replyBoardId,
            text: "a chai test",
            delete_password: deleteReply
          })
          .end((err, res) => {
            let ip = res.redirects[0].substr(0, res.redirects[0].indexOf("/b"));
            assert.equal(res.status, 200);
            assert.equal(
              res.redirects[0],
              ip + "/b/chaiReply/" + replyBoardId
            );
            done();
          });
      });
    });
    suite("GET", function() {
      test("Getting all the replies of a specified board", function(done) {
        chai
          .request(server)
          .get("/api/replies/:board/?thread_id=" + replyBoardId)
          .send({ thread_id: replyBoardId })
          .end((err, res) => {
            //getting the most recent reply we posted to the board for the test
            replyId = res.body.replies[res.body.replies.length - 1]._id;
            assert.equal(res.status, 200);
            assert.equal(res.body._id, replyBoardId);
            assert.isArray(res.body.replies);
            assert.property(res.body, "_id");
            assert.property(res.body, "text");
            assert.property(res.body, "created_on");
            assert.property(res.body, "bumped_on");
            assert.property(res.body, "replies");
            assert.notProperty(res.body, "delete_password");
            assert.notProperty(res.body, "reported");
            done();
          });
      });
    });

    suite("PUT", function() {
      test("Reporting a thread", function(done) {
        chai
          .request(server)
          .put("/api/replies/:board")
          .send({ thread_id: replyBoardId, reply_id: replyId })
          .end((err, res) => {
            assert.equal(res.status, 200);
            assert.equal(res.text, '"success"');
            done();
          });
      });
    });

    suite("DELETE", function() {
      test("Deleting a reply with an incorrect password", function(done) {
        chai
          .request(server)
          .delete("/api/replies/:board")
          .send({
            thread_id: replyBoardId,
            reply_id: replyId,
            delete_password: "wrong"
          })
          .end((err, res) => {
            assert.equal(res.status, 200);
            assert.equal(res.text, '"incorrect password"');
            done();
          });
      });
      test("Deleting a reply with the correct password", function(done) {
        chai
          .request(server)
          .delete("/api/replies/:board")
          .send({
            thread_id: replyBoardId,
            reply_id: replyId,
            delete_password: deleteReply
          })
          .end((err, res) => {
            assert.equal(res.status, 200);
            assert.equal(res.text, '"success"');
            done();
          });
      });
    });
  });
});
