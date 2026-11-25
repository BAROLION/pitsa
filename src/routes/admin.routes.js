import { Router } from 'express';
import adminController from '../controllers/adminController.js';
import { adminAuth, localOnly, loginRateLimit, asyncHandler as h } from '../middlewares/auth.middleware.js';

const router = Router();

// Lokal: faqat shu kompyuterdan. Render: faqat kuchli parol o'rnatilgan bo'lsa.
router.use(localOnly);

// Login — ochiq (urinishlar soni cheklangan)
router.post('/login', loginRateLimit, h(adminController.login));

// Qolgan barcha yo'llar parol bilan himoyalangan
router.use(adminAuth);

router.get('/stats', h(adminController.getStats));

router.get('/orders', h(adminController.getOrders));
router.patch('/orders/:id/status', h(adminController.updateOrderStatus));
router.post('/orders/:id/courier', h(adminController.assignCourier));
router.delete('/orders/:id', h(adminController.deleteOrder));

router.get('/products', h(adminController.getProducts));
router.post('/products', h(adminController.createProduct));
router.put('/products/:id', h(adminController.updateProduct));
router.delete('/products/:id', h(adminController.deleteProduct));

router.get('/users', h(adminController.getUsers));

export default router;
