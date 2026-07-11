import { Router, type IRouter } from "express";
import healthRouter from "./health";
import matchRouter from "./match";
import scholarshipsRouter from "./scholarships";

const router: IRouter = Router();

router.use(healthRouter);
router.use(matchRouter);
router.use(scholarshipsRouter);

export default router;
