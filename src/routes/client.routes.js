import { Router } from 'express';
import cartController from '../controllers/cartController.js';
import { telegramAuth, asyncHandler as h } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(telegramAuth);

router.get('/me', h(cartController.getMe));
router.post('/profile', h(cartController.updateProfile));

router.get('/categories', h(cartController.getCategories));
router.get('/products', h(cartController.getProducts));

router.get('/orders', h(cartController.getMyOrders));
router.post('/orders', h(cartController.createOrder));
router.post('/orders/:id/cancel', h(cartController.cancelOrder));

export default router;
