exports.flash = (req, message, type = "green") => {
  req.session.flash = {
    message,
    type,
  };
};
