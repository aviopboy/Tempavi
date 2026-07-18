import { Router, type IRouter } from "express";
import healthRouter from "./health";
import animeRouter from "./anime";
import userRouter from "./user";

const router: IRouter = Router();

router.use(healthRouter);
router.use(animeRouter);
router.use(userRouter);

export default router;
