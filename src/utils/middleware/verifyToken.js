// middleware/verifyToken.js
const jwt = require('jsonwebtoken');
const jwtKey = 'e-com';

function verifyToken(req, res, next) {
    let token = req.headers['authorization'];
    if (token) {
        token = token.split(' ')[1];
        jwt.verify(token, jwtKey, (err, valid) => {
            if (err) {
                return res.status(401).send({ result: 'Please provide a valid token' });
            } else {
                req.user = valid; // Optional: attach the decoded token to the request object
                next();
            }
        });
    } else {
        return res.status(403).send({ result: 'Please provide a token' });
    }
}

module.exports = verifyToken;
