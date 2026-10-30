import { Router } from "express";
import { HttpError } from "../common/errors/http-error";
import { authService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

const router = Router();

router.post("/login", async (req, res) => {
  try {
    const dto: LoginDto = req.body;
    const result = await authService.login(dto);
    res.json(result);
  } catch (err) {
    if (err instanceof HttpError) {
      res.status(err.statusCode).json({ message: err.message });
      return;
    }

    const message = err instanceof Error ? err.message : "Login failed";
    res.status(500).json({ message });
  }
});

router.post("/register", async (req, res) => {
  try {
    const dto: RegisterDto = req.body;
    const result = await authService.register(dto);
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof HttpError) {
      res.status(err.statusCode).json({ message: err.message });
      return;
    }

    const message = err instanceof Error ? err.message : "Registration failed";
    res.status(500).json({ message });
  }
});

export default router;
