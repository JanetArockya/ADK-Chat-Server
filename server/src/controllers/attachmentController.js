function notImplemented(name) {
	return (_req, res) =>
		res.status(501).json({ message: `${name} is not implemented yet` });
}

module.exports = {
	uploadAttachment: notImplemented("uploadAttachment"),
	downloadAttachment: notImplemented("downloadAttachment"),
};
