const express = require("express");
const { Transform } = require("json2csv");
const { pipeline } = require("stream");
const { join } = require("path");
const { createReadStream } = require("fs-extra");
const { check, validationResult } = require("express-validator");
const { getUsers, writeUsers, getMedia } = require("../../fsUtilities");
const uniqid = require("uniqid");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");
const cloudinary = require("../../cloudinary");

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "striveFlix/users",
  },
});

const cloudinaryMulter = multer({ storage: storage });

const usersRouter = express.Router();
usersRouter.get("/", async (req, res, next) => {
  try {
    const all = await getUsers();
    let users;
    if (req.query && req.query.email) {
      users = all.find((user) => user.email === req.query.email);
    } else {
      users = all.filter((user) => user.role === "client");
    }
    res.send(users);
  } catch (error) {
    next(error);
  }
});

usersRouter.get("/admin", async (req, res, next) => {
  try {
    const all = await getUsers();
    const users = all.filter((user) => user.role === "admin");
    res.send(users);
  } catch (error) {
    next(error);
  }
});
usersRouter.get("/:id", async (req, res, next) => {
  try {
    const all = await getUsers();
    const user = all.find((user) => user._id === req.params.id);
    res.send(user);
  } catch (error) {
    next(error);
  }
});
usersRouter.post(
  "/",
  [
    check("name").isLength({ min: 4 }).withMessage("No way! Name too short!").exists().withMessage("Add a name please!"),
    check("surname").isLength({ min: 4 }).withMessage("No way! Surname too short!").exists().withMessage("Add a surname please!"),
    check("email").isEmail().withMessage("No way! Email not correct!").exists().withMessage("Add an email please!"),
    check("yearOfBirth").isNumeric().withMessage("Year of pirth should be a number").exists().withMessage("Add a Year of birth please!"),
    check("address").isLength({ min: 5 }).withMessage("Invalid address").exists().withMessage("Add address please!"),
    check("city").exists().withMessage("Add City please!"),
    check("postalCode").exists().withMessage("Add Postal Code please!"),
    check("cardExpDate").exists().withMessage("Add Exp. Date please!"),
    check("cardNumber").exists().withMessage("Add Credit Card Number please!"),
    check("password").isLength({ min: 8 }).isAlphanumeric().exists().withMessage("Add a valid password please!"),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const err = new Error();
        err.message = errors;
        err.httpStatusCode = 400;
        next(err);
      } else {
        const users = await getUsers();
        const email = users.find((user) => user.email === req.body.email);
        if (email) {
          const err = new Error();
          err.message = "Email already used";
          err.httpStatusCode = 409;
          next(err);
        } else {
          const newUser = {
            ...req.body,
            _id: uniqid(),
            role: "client",
          };
          users.push(newUser);
          await writeUsers(users);
          res.status(201).send(newUser);
        }
      }
    } catch (error) {
      next(error);
    }
  }
);
usersRouter.post(
  "/admin",
  cloudinaryMulter.single("image"),
  [
    check("name").isLength({ min: 4 }).withMessage("No way! Name too short!").exists().withMessage("Add a name please!"),
    check("surname").isLength({ min: 4 }).withMessage("No way! Surname too short!").exists().withMessage("Add a surname please!"),
    check("email").isEmail().withMessage("No way! Email not correct!").exists().withMessage("Add an email please!"),
    check("address").isLength({ min: 5 }).withMessage("Invalid address").exists().withMessage("Add address please!"),
    check("city").exists().withMessage("Add City please!"),
    check("postalCode").exists().withMessage("Add Postal Code please!"),
    check("password").isLength({ min: 8 }).isAlphanumeric().exists().withMessage("Add a valid password please!"),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const err = new Error();
        err.message = errors;
        err.httpStatusCode = 400;
        next(err);
      } else {
        const users = await getUsers();
        const email = users.find((user) => user.email === req.body.email);
        if (email) {
          const err = new Error();
          err.message = "Email already used";
          err.httpStatusCode = 409;
          next(err);
        } else {
          const newUser = {
            _id: uniqid(),
            role: "admin",
            ...req.body,
            image: req.file ? req.file.path : "",
          };
          users.push(newUser);
          await writeUsers(users);
          res.status(201).send(newUser);
        }
      }
    } catch (error) {
      next(error);
    }
  }
);
usersRouter.put(
  "/:id",
  [
    check("name").isLength({ min: 4 }).withMessage("No way! Name too short!").exists().withMessage("Add a name please!"),
    check("surname").isLength({ min: 4 }).withMessage("No way! Surname too short!").exists().withMessage("Add a surname please!"),
    check("email").isEmail().withMessage("No way! Email not correct!").exists().withMessage("Add an email please!"),
    check("yearOfBirth").isNumeric().withMessage("Year of pirth should be a number").exists().withMessage("Add a Year of birth please!"),
    check("address").isLength({ min: 5 }).withMessage("Invalid address").exists().withMessage("Add address please!"),
    check("city").exists().withMessage("Add City please!"),
    check("postalCode").exists().withMessage("Add Postal Code please!"),
    check("cardExpDate").exists().withMessage("Add Exp. Date please!"),
    check("cardNumber").exists().withMessage("Add Credit Card Number please!"),
    check("password").isLength({ min: 8 }).isAlphanumeric().exists().withMessage("Add a valid password please!"),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const err = new Error();
        err.message = errors;
        err.httpStatusCode = 400;
        next(err);
      } else {
        const users = await getUsers();
        const email = users.find((user) => user.email === req.body.email && user._id !== req.params.id);
        if (email) {
          const err = new Error();
          err.message = "Email already used";
          err.httpStatusCode = 409;
          next(err);
        } else {
          const userIndex = users.findIndex((user) => user._id === req.params.id);
          if (userIndex !== -1) {
            delete req.body._id;
            const updateUser = {
              ...users[userIndex],
              ...req.body,
            };
            const updatedDB = [...users.slice(0, userIndex), updateUser, ...users.slice(userIndex + 1)];
            await writeUsers(updatedDB);
            res.status(201).send(updateUser);
          } else {
            const err = new Error();
            err.httpStatusCode = 404;
            err.message = "User Not Found";
            next(err);
          }
        }
      }
    } catch (error) {
      next(error);
    }
  }
);
usersRouter.put(
  "/admin/:id",
  [
    check("name").isLength({ min: 4 }).withMessage("No way! Name too short!").exists().withMessage("Add a name please!"),
    check("surname").isLength({ min: 4 }).withMessage("No way! Surname too short!").exists().withMessage("Add a surname please!"),
    check("email").isEmail().withMessage("No way! Email not correct!").exists().withMessage("Add an email please!"),
    check("address").isLength({ min: 5 }).withMessage("Invalid address").exists().withMessage("Add address please!"),
    check("city").exists().withMessage("Add City please!"),
    check("postalCode").exists().withMessage("Add Postal Code please!"),
    check("password").isLength({ min: 8 }).isAlphanumeric().exists().withMessage("Add a valid password please!"),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const err = new Error();
        err.message = errors;
        err.httpStatusCode = 400;
        next(err);
      } else {
        const users = await getUsers();
        const email = users.find((user) => user.email === req.body.email && user._id !== req.params.id);
        if (email) {
          const err = new Error();
          err.message = "Email already used";
          err.httpStatusCode = 409;
          next(err);
        } else {
          const userIndex = users.findIndex((user) => user._id === req.params.id);
          if (userIndex !== -1 && users[userIndex].role === "admin") {
            delete req.body._id;
            const updateUser = {
              ...users[userIndex],
              ...req.body,
            };
            const updatedDB = [...users.slice(0, userIndex), updateUser, ...users.slice(userIndex + 1)];
            await writeUsers(updatedDB);
            res.status(201).send(updateUser);
          } else {
            const err = new Error();
            err.httpStatusCode = 404;
            err.message = "User Not Found";
            next(err);
          }
        }
      }
    } catch (error) {
      next(error);
    }
  }
);
usersRouter.delete("/:id", async (req, res, next) => {
  try {
    const users = await getUsers();
    const filterdUsers = users.filter((user) => user._id !== req.params.id);
    if (filterdUsers.length === users.length) {
      const error = new Error("User not found");
      error.httpStatusCode = 404;
      return next(error);
    }
    writeUsers(filterdUsers);
    res.status(201).send("Account has been deleted");
  } catch (error) {
    next(error);
  }
});
///Watchlist and favourite list
usersRouter.get("/:id/myList", async (req, res, next) => {
  try {
    const users = await getUsers();
    const mylist = users.find((user) => user.role === "client" && user._id === req.params.id).myList || [];
    res.send(mylist);
  } catch (error) {
    next(error);
  }
});
usersRouter.post("/:id/myList/:imdbId", async (req, res, next) => {
  try {
    const users = await getUsers();
    const movies = await getMedia();
    const userIndex = users.findIndex((user) => user._id === req.params.id && user.role === "client");
    const movieIndex = movies.findIndex((movie) => movie.imdbID === req.params.imdbId);

    if (movieIndex !== -1 && userIndex !== -1) {
      const updateUser = {
        ...users[userIndex],
        myList: users[userIndex].myList ? (!users[userIndex].myList.includes(req.params.imdbId) ? [...users[userIndex].myList, req.params.imdbId] : users[userIndex].myList) : [req.params.imdbId],
      };
      const updatedDB = [...users.slice(0, userIndex), updateUser, ...users.slice(userIndex + 1)];
      await writeUsers(updatedDB);
      res.status(201).send(updateUser.myList);
    } else {
      const err = new Error();
      err.message = "Client or movie were not found";
      err.httpStatusCode = 404;
      next(err);
    }
  } catch (error) {
    next(error);
  }
});
usersRouter.delete("/:id/myList/:imdbId", async (req, res, next) => {
  try {
    const users = await getUsers();
    const userIndex = users.findIndex((user) => user._id === req.params.id);
    if (userIndex !== -1) {
      const updateUser = {
        ...users[userIndex],
        myList: users[userIndex].myList.filter((movie) => movie !== req.params.imdbId),
      };
      const updatedDB = [...users.slice(0, userIndex), updateUser, ...users.slice(userIndex + 1)];
      await writeUsers(updatedDB);
      res.status(201).send(updateUser.myList);
    }
  } catch (error) {
    next(error);
  }
});

/// POST Profile picture

usersRouter.post("/:id/upload", cloudinaryMulter.single("image"), async (req, res, next) => {
  try {
    const users = await getUsers();
    const userIndex = users.findIndex((user) => user._id === req.params.id);

    if (userIndex !== -1) {
      // user found
      const updatedusers = [...users.slice(0, userIndex), { ...users[userIndex], image: req.file.path }, ...users.slice(userIndex + 1)];
      await writeUsers(updatedusers);
      res.send(updatedusers[userIndex]);
    } else {
      const err = new Error();
      err.httpStatusCode = 404;
      err.message = "user Not Found";
      next(err);
    }
  } catch (error) {
    next(error);
  }
});
module.exports = usersRouter;
