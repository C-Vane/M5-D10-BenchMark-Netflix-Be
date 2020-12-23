const express = require("express");
const { check, validationResult, matchedData } = require("express-validator");
const axios = require("axios");
const { join } = require("path");
const uniqid = require("uniqid");
const { getMedia, writeMedia } = require("../../fsUtilities");
const mediaRouter = express.Router();

sortMovies = (movies) =>
  movies.sort((a, b) => {
    return a.reviews && b.reviews
      ? a.reviews.reduce((c, d) => c.rate + d.rate) / a.reviews.length > b.reviews.reduce((c, d) => c.rate + d.rate) / b.reviews.length
        ? 1
        : a.reviews.reduce((c, d) => c.rate + d.rate) / a.reviews.length < b.reviews.reduce((c, d) => c.rate + d.rate) / b.reviews.length
        ? -1
        : 0
      : 0;
  });

mediaRouter.get("/", async (req, res, next) => {
  try {
    const mediaDB = await getMedia();
    const media = sortMovies(mediaDB);
    if (req.query.year || req.query.s || req.query.type) {
      let filterdMedia;
      if (req.query.s) filterdMedia = media.filter((movie) => movie.Title.toLowerCase().includes(req.query.s.toLowerCase()));
      else if (req.query.year) filterdMedia = media.filter((movie) => movie.Year.includes(req.query.year));
      else if (req.query.type) filterdMedia = media.filter((movie) => movie.Type.toLowerCase().includes(req.query.type.toLowerCase()));
      res.send(filterdMedia);
    } else {
      res.send(media);
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
});
mediaRouter.get("/:id", async (req, res, next) => {
  try {
    const media = await getMedia();
    const movie = media.find((movie) => movie.imdbID === req.params.id);
    if (movie) {
      const response = await axios.get(process.env.MOVIE_API + "s=" + movie.Title);
      const movieID = response.data.Search[0].imdbID;
      const movieDetails = await axios.get(process.env.MOVIE_API + "i=" + movieID);

      res.send(movieDetails.data);
    } else {
      const err = new Error();
      err.httpStatusCode = 404;
      err.message = "Media Not Found";
      next(err);
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
});
mediaRouter.post(
  "/",
  [check("Title").exists().withMessage("Title is required"), check("Year").exists().withMessage("Year is required"), check("Type").exists().withMessage("Type is required")],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const error = new Error();
        error.message = errors;
        error.httpStatusCode = 400;
        next(error);
      } else {
        const media = await getMedia();
        const newMovie = {
          ...req.body,
          imdbID: uniqid(),
        };
        media.push(newMovie);
        await writeMedia(media);
        res.satus(201).send(newMoviem);
      }
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
);

mediaRouter.put(
  "/:id",
  [check("Title").exists().withMessage("Title is required"), check("Year").exists().withMessage("Year is required"), check("Type").exists().withMessage("Type is required")],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const error = new Error();
        error.message = errors;
        error.httpStatusCode = 400;
        next(error);
      } else {
        const media = await getMedia();

        const movieIndex = media.findIndex((movie) => movie.imdbID === req.params.id);

        if (movieIndex !== -1) {
          // movie found
          const updatedMedia = [...media.slice(0, movieIndex), { ...media[movieIndex], ...req.body }, ...media.slice(movieIndex + 1)];
          await writeMedia(updatedMedia);
          res.send(updatedMedia);
        } else {
          const err = new Error();
          err.httpStatusCode = 404;
          next(err);
        }
      }
    } catch (error) {
      console.log(error);
      const err = new Error("An error occurred while reading from the file");
      next(err);
    }
  }
);
mediaRouter.delete("/:id", async (req, res, next) => {
  try {
    const media = await getMedia();

    const movieFound = media.find((movie) => movie.imdbID === req.params.id);

    if (movieFound) {
      const filteredMedia = media.filter((movie) => movie.imdbID !== req.params.id);
      await writeMedia(filteredMedia);
      res.status(204).send("Movie deleted");
    } else {
      const error = new Error();
      error.httpStatusCode = 404;
      error.message = "Movie not Found";
      next(error);
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
});

/// POST IMAGE
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");
const cloudinary = require("../../cloudinary");

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "striveFlix",
  },
});

const cloudinaryMulter = multer({ storage: storage });

mediaRouter.post("/:id/upload", cloudinaryMulter.single("image"), async (req, res, next) => {
  try {
    const media = await getMedia();
    const movieIndex = media.findIndex((movie) => movie.imdbID === req.params.id);

    if (movieIndex !== -1) {
      // movie found
      const updatedMedia = [...media.slice(0, movieIndex), { ...media[movieIndex], Poster: req.file.path }, ...media.slice(movieIndex + 1)];
      await writeMedia(updatedMedia);
      res.send(updatedMedia[movieIndex]);
    } else {
      const err = new Error();
      err.httpStatusCode = 404;
      err.message = "Movie Not Found";
      next(err);
    }
  } catch (error) {
    next(error);
  }
});

// Send pdf

const PDFDocument = require("pdfkit");
const fs = require("fs");

mediaRouter.get("/catalogue/PDF", async (req, res, next) => {
  try {
    if (req.query.title) {
      const media = await getMedia();
      const filterdMedia = media.filter((movie) => movie.Title.toLowerCase().includes(req.query.title.toLowerCase()));
      if (filterdMedia) {
        let pdfDoc = new PDFDocument();
        pdfDoc.text("Movies Catalog for => " + req.query.title);
        filterdMedia.map(async (movie, i) => {
          pdfDoc.text(i + 1 + " " + movie.Title);
          pdfDoc.text(movie.Year);
          pdfDoc.text(movie.Type);
        });

        res.setHeader("Content-Type", "application/pdf");

        pdfDoc.pipe(res);
        pdfDoc.end();
      } else {
        const err = new Error();
        err.httpStatusCode = 404;
        err.message = "Movies Not Found";
        next(err);
      }
    } else {
      const err = new Error();
      err.httpStatusCode = 400;
      err.message = "Title query not given";
      next(err);
    }
  } catch (error) {
    next(error);
  }
});

//Send Email

const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

mediaRouter.get("/sendCatalogue/email", async (req, res, next) => {
  try {
    if (req.body.title && req.body.email) {
      const media = await getMedia();
      const filterdMedia = media.filter((movie) => movie.Title.toLowerCase().includes(req.body.title.toLowerCase()));
      if (filterdMedia) {
        const pdfPath = join(__dirname, "current.pdf");
        let pdfDoc = new PDFDocument();
        pdfDoc.text("Movies Catalog for => " + req.body.title);
        filterdMedia.map(async (movie, i) => {
          pdfDoc.text(i + 1 + " " + movie.Title);
          pdfDoc.text(movie.Year);
          pdfDoc.text(movie.Type);
        });

        pdfDoc.pipe(fs.createWriteStream(pdfPath));
        pdfDoc.end();

        fs.readFile(pdfPath, function (err, data) {
          if (err) {
          }
          if (data) {
            const msg = {
              to: req.body.email, // Change to your recipient
              from: "vanecattabiani@gmail.com", // Change to your verified sender
              subject: "Movies Catalogue",
              text: "Thank you for requesting a movie catalogue for " + req.body.title,
              html: `<strong>Thank you for requesting a movie catalogue for "${req.body.title}"!!!</strong>`,
              attachments: [
                {
                  content: data.toString("base64"),
                  filename: "movies.pdf",
                  type: "plain/text",
                  disposition: "attachment",
                },
              ],
            };
            sgMail
              .send(msg)
              .then(() => {
                res.status(201).send("Email sent");
              })
              .catch((error) => {
                next(error);
              });
          }
        });
      } else {
        const err = new Error();
        err.httpStatusCode = 404;
        err.message = "Movies Not Found";
        next(err);
      }
    } else {
      const err = new Error();
      err.httpStatusCode = 400;
      err.message = "Title or Email not given";
      next(err);
    }
  } catch (error) {
    next(error);
  }
});
module.exports = mediaRouter;
