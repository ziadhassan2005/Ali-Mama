import { Router } from "express";
import { authService } from "../auth/auth.service";
import { AuthRequest, jwtMiddleware } from "../auth/jwt.middleware";
import { HttpError } from "../common/errors/http-error";

const router = Router();

router.use(jwtMiddleware);

router.patch("/me/email", async (req: AuthRequest, res) => {
    try {
        const email = req.body?.email;
        const result = await authService.updateEmail(String(req.userId), { email });
        res.json(result);
    } catch (err) {
        if (err instanceof HttpError) {
            res.status(err.statusCode).json({ message: err.message });
            return;
        }

        const message = err instanceof Error ? err.message : "Unable to update email";
        res.status(500).json({ message });
    }
});

router.patch("/me/password", async (req: AuthRequest, res) => {
    try {
        const { currentPassword, newPassword } = req.body ?? {};
        const result = await authService.updatePassword(String(req.userId), {
            currentPassword,
            newPassword,
        });

        res.json(result);
    } catch (err) {
        if (err instanceof HttpError) {
            res.status(err.statusCode).json({ message: err.message });
            return;
        }

        const message = err instanceof Error ? err.message : "Unable to update password";
        res.status(500).json({ message });
    }
});

export default router;
