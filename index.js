const express = require("express");
const fs = require("fs");
const routes = require("./routes");
const pool = require("./db");
require("dotenv").config();

const app = express();
app.use(routes);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const [result] = await pool.query("DELETE FROM posts WHERE id = ?", [id]);
  if (result.affectedRows === 0) {
    return res.status(404).json({ message: "Post not found" });
  }
  res.json({ message: "Post deleted." });
});

const PORT = process.env.port || 3000;

app.listen(PORT);
