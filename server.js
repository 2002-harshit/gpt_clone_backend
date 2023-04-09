"use strict";
const Express = require("express");
const OpenAI = require("openai");
const axios = require("axios");
require("dotenv").config();
const { Configuration, OpenAIApi } = OpenAI;
const app = Express();
app.use(Express.json());

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

app.use((req, res, next) => {
  res.setHeader(
    "Access-Control-Allow-Origin",
    process.env.FRONTEND_URL || `http://localhost:8080`
  ),
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

app.get("/", (req, res) => {
  res.json("Welcome");
});

const withinLimit = function () {
  if (chatML.length > 5) {
    chatML.shift();
  }
};

let chatML = []; //* for storing historical conversations
// chatML.push({ role: "system", content: "You are a helpful assistant." });

app.post("/user_input", async (req, res) => {
  const fromUser = req.body;
  chatML.push(fromUser);
  withinLimit();
  res.sendStatus(200);
});

app.get("/sse", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const url = `https://api.openai.com/v1/chat/completions`;
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
  };
  const body = JSON.stringify({
    model: "gpt-3.5-turbo",
    max_tokens: 200,
    messages: chatML,
    stream: true,
  });

  const responseStream = await axios.post(url, body, {
    headers,
    responseType: "stream",
  });

  responseStream.data.on("data", chunk => {
    const message = chunk.toString();
    if (message.trim().includes("[DONE]")) {
      res.write("event: done\n");
      res.write(`data: ${message}\n\n`);
      res.end();
    } else {
      // console.log(message);
      res.write(`${message}\n\n`);
    }
  });

  req.on("close", () => {
    responseStream.data.destroy();
  });
});

app.post("/chat_reset", (req, res) => {
  chatML.splice(0);
  console.log(chatML);
  res.json({ msg: "Context is removed successfully" });
});

app.post("/update_context", (req, res) => {
  chatML.push(req.body);
  withinLimit();
  console.log(chatML);
  res.sendStatus(200);
});

app.listen(process.env.PORT || 8000, () => {
  console.log("Server started at port 8000");
});
