import { Router, type IRouter } from "express";
import healthRouter from "./health";
import landingRouter from "./landing";
import adminAuthRouter from "./adminAuth";
import storageRouter from "./storage";
import securityRouter from "./security";

const router: IRouter = Router();
router.use(healthRouter);
router.use(landingRouter);
router.use(adminAuthRouter);
router.use(storageRouter);
router.use(securityRouter);
export default router;
