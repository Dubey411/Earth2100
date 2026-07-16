import { auth } from "../config/firebase.js";

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Access Denied: No token provided" });
    }

    const token = authHeader.split(" ")[1];
    
    // Verify the Firebase JWT token
    const decodedToken = await auth.verifyIdToken(token);
    
    // Attach the user info to the request object
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
      picture: decodedToken.picture,
    };
    
    next();
  } catch (error) {
    console.error("Token verification failed:", error);
    return res.status(403).json({ error: "Access Denied: Invalid or expired token" });
  }
};

export { verifyToken };
