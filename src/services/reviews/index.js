const express = require("express");
const { check, validationResult, matchedData } = require("express-validator");
const { createReadStream } = require("fs-extra");
const { join } = require("path");
const { pipeline } = require("stream");
const { getMedia, writeMedia } = require("../../fsUtilities");
const reviewsRouter = express.Router();
const uniqid = require("uniqid");

reviewsRouter.get("/:id", async (req, res, next) => {
  try {
    const media = await getMedia();
    const movie = media.find((movie) => movie.imdbID === req.params.id);
    if (movie.reviews) {
      res.send(movie.reviews);
    } else {
      const err = new Error();
      err.httpStatusCode = 404;
      err.message = "Movie Not Found";
      next(err);
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
});
reviewsRouter.post(
  "/",
  [check("comment").exists().withMessage("Commment is required"), check("rate").exists().withMessage("Rate is required"), check("elementID").exists().withMessage("Element ID is required")],
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
        const movieIndex = media.findIndex((movie) => movie.imdbID === req.body.elementID);
        if (movieIndex !== -1) {
          // movie found
          const reviews = media[movieIndex].reviews || [];
          newReview = {
            ...req.body,
            _id: uniqid(),
            createdAt: new Date(),
          };
          reviews.push(newReview);
          const updatedMedia = [...media.slice(0, movieIndex), { ...media[movieIndex], reviews }, ...media.slice(movieIndex + 1)];
          await writeMedia(updatedMedia);
          res.send(updatedMedia);
        } else {
          const err = new Error();
          err.httpStatusCode = 404;
          err.message = "Movie not found";
          next(err);
        }
      }
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
);

reviewsRouter.put(
  "/:id",
  [check("comment").exists().withMessage("Commment is required"), check("rate").exists().withMessage("Rate is required"), check("elementID").exists().withMessage("Element ID is required")],
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
        const movieIndex = media.findIndex((movie) => movie.imdbID === req.body.elementID);
        if (movieIndex !== -1) {
          // movie found
          const reviewIndex = media[movieIndex].reviews.findIndex((review) => review._id === req.params._id);
          if (reviewIndex !== -1) {
            const reviews = media[movieIndex].reviews;
            newReview = {
              ...reviews[reviewIndex],
              ...req.body,
              editedAt: new Date(),
            };
            const updatedReviews = [...reviews.slice(0, reviewIndex), newReview, ...reviews.slice(reviewIndex + 1)];
            const updatedMedia = [...media.slice(0, movieIndex), { ...media[movieIndex], reviews: updatedReviews }, ...media.slice(movieIndex + 1)];
            await writeMedia(updatedMedia);
            res.send(updatedReviews);
          } else {
            const err = new Error();
            err.httpStatusCode = 404;
            err.message = "Review not found";
            next(err);
          }
        } else {
          const err = new Error();
          err.httpStatusCode = 404;
          err.message = "Movie not found";
          next(err);
        }
      }
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
);

reviewsRouter.delete("/:imdbID/:id", async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error();
      error.message = errors;
      error.httpStatusCode = 400;
      next(error);
    } else {
      const media = await getMedia();
      const movieIndex = media.findIndex((movie) => movie.imdbID === req.params.imdbID);
      if (movieIndex !== -1) {
        // movie found
        const reviewIndex = media[movieIndex].reviews.findIndex((review) => review._id === req.params.id);
        if (reviewIndex !== -1) {
          const reviews = media[movieIndex].reviews.filter((review) => review._id !== req.params.id);
          const updatedMedia = [...media.slice(0, movieIndex), { ...media[movieIndex], reviews }, ...media.slice(movieIndex + 1)];
          await writeMedia(updatedMedia);
          res.send("Review deleted");
        } else {
          const err = new Error();
          err.httpStatusCode = 404;
          err.message = "Review not found";
          next(err);
        }
      } else {
        const err = new Error();
        err.httpStatusCode = 404;
        err.message = "Movie not found";
        next(err);
      }
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
});
module.exports = reviewsRouter;
