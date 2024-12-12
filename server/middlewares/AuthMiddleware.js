import jwt from "jsonwebtoken";

export const verifyToken = (request, response, next) => {
    const token = request.cookies?.jwt;
    if (!token) {
        console.log("JWT cookie not found");
        return response.status(401).send("You are not authenticated!");
    }
    jwt.verify(token, process.env.JWT_KEY, async (err, payload) => {
        if (err) {
            console.log("JWT verification failed", err);
            return response.status(403).send("Token is not valid!");
        }
        request.userId = payload.userId;
        next();
    });
};
