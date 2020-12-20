const { readJSON, writeJSON } = require("fs-extra");
const { join } = require("path");

const mediaPath = join(__dirname, "./services/media/media.json");
const usersPath = join(__dirname, "./services/users/users.json");

const readDB = async (filePath) => {
  try {
    const fileJson = await readJSON(filePath);
    return fileJson;
  } catch (error) {
    throw new Error(error);
  }
};

const writeDB = async (filePath, fileContent) => {
  try {
    await writeJSON(filePath, fileContent);
  } catch (error) {
    throw new Error(error);
  }
};

module.exports = {
  getMedia: async () => readDB(mediaPath),
  writeMedia: async (mediaData) => writeDB(mediaPath, mediaData),
  getUsers: async () => readDB(usersPath),
  writeUsers: async (usersData) => writeDB(usersPath, usersData),
};
