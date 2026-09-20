const axios = require("axios");
const FormData = require("form-data");

const predictLeaf = async (file) => {
  const form = new FormData();

  form.append("image", file.buffer, {
    filename: file.originalname,
    contentType: file.mimetype,
  });

  const response = await axios.post(
    `${process.env.ML_SERVICE_URL}/predict`,
    form,
    {
      headers: form.getHeaders(),
      timeout: 60000,
    },
  );

  return response.data;
};

module.exports = predictLeaf;
