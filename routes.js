const express = require("express");
const router = express.Router();

const path = require("path");
const multer = require("multer");
const cors = require("cors");
const session = require("express-session");
const pool = require("./db");

router.use(cors());
router.use(express.json());
router.use(express.urlencoded({ extended: true }));
router.use(express.static(path.join(__dirname, "public")));
router.use(
  session({
    secret: "supersecretkey",
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  })
);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "images"));
  },
  filename: function (req, file, cb) {
    pool
      .query("insert into file(ext) values(?)", [
        path.extname(file.originalname).slice(1),
      ])
      .then((result) => {
        return result[0];
      })
      .then((result) => {
        req.fileId = result.insertId;
        req.extName = path.extname(file.originalname).slice(1);
        cb(null, result.insertId + path.extname(file.originalname));
      })
      .catch((err) => {
        console.log(err);
        cb(err);
      });
  },
});
const upload = multer({ storage: storage });

const get = {
  dash: (req, res) => res.sendFile(path.join(__dirname, "pages", "dash.html")),

  log: (req, res) => {
    if (req.session.user) {
      return res.redirect("/dash");
    }
    res.sendFile(path.join(__dirname, "pages", "log.html"));
  },

  async posts(req, res) {
    const [rows] = await pool.query(
      "SELECT text,id,created_at,file_id FROM post"
    );
    const [result] = await pool.query("SELECT * FROM file");
    rows.forEach((post) => {
      const file = result.find((f) => f.id === post.file_id);
      if (file) {
        post.url = `image/${file.id}.${file.ext}`;
      } else {
        post.url = null;
      }
    });
    res.json(rows);
  },

  sine(req, res) {
    res.sendFile(path.join(__dirname, "pages", "sine.html"));
  },

  image(req, res) {
    const { name } = req.params;
    res.sendFile(path.join(__dirname, "images", name));
  },
};

const post = {
  async sine(req, res) {
    const { name, email, pass } = req.body;
    const [row] = await pool.query(
      "SELECT EXISTS (SELECT 1 FROM user WHERE email = ($1)) AS found",
      [email]
    );
    if (row[0].found) {
      return res.json({ message: "User already exists!" });
    }
    await pool.query("INSERT INTO user (name, email, pass) VALUES ($1,$2,$3)", [
      name,
      email,
      pass,
    ]);
    req.session.user = { email: email };
    res.json({ message: "success" });
  },

  log(req, res) {
    try {
      req.session.user = { email: req.body.email };
      res.json({ success: true });
    } catch (error) {
      console.log(error);
      res.json({
        success: false,
        message: "some error occured.",
      });
    }
  },

  async post(req, res) {
    try {
      const { text } = req.body;
      const [result] = await pool.query(
        "INSERT INTO post (text, file_id, email) VALUES (?,?,?)",
        [text, req.fileId, req.session.user.email]
      );

      const id = result.insertId;
      const [rows] = await pool.query(
        "select text, id, created_at, file_id FROM post where id = ?",
        [id]
      );

      const data = {
        text: rows[0].text,
        id: rows[0].id,
        created_at: rows[0].created_at,
        url: req.fileId ? `image/${req.fileId}.${req.extName}` : null,
      };

      res.json({ message: "success", data: data });
    } catch (err) {
      console.error(err);
      res.json({ message: "Post creation failed!" });
    }
  },
};

const put = {
  async post(req, res) {
    try {
      const { id } = req.params;
      const { content } = req.body;

      await pool.query("UPDATE posts SET content = ($1) WHERE id = ($2)", [
        content,
        id,
      ]);
      res.json({ message: "success" });
    } catch (err) {
      console.log(err);
      res.json({ message: "Post update failed!" });
    }
  },
};

router.get("/sine", get.sine);
router.get("/log", get.log);
router.post("/sine", post.sine);
router.post("/log", post.log);

router.use((req, res, next) => {
  if (!req.session.user) {
    return res.redirect("/log");
  }
  next();
});

router.get("/", get.dash);
router.get("/dash", get.dash);
router.get("/posts", get.posts);
router.get("/image/:name", get.image);

router.post("/post", upload.single("image"), post.post);
router.post("/upload", upload.single("myFile"), (req, res) => res.json("done"));

router.put("/post/:id", put.post);

module.exports = router;
