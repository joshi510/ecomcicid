import { Router } from 'express';
import { csrfToken } from '../controllers/csrf.controller.js';
import { adminRouter } from './admin.routes.js';
import { adminOrderRouter } from './admin-order.routes.js';
import { addressRouter } from './address.routes.js';
import { authRouter } from './auth.routes.js';
import { cartRouter } from './cart.routes.js';
import { categoryRouter } from './category.routes.js';
import { healthRouter } from './health.routes.js';
import { orderRouter } from './order.routes.js';
import { paymentRouter } from './payment.routes.js';
import { productRouter } from './product.routes.js';

export const apiRouter = Router();

apiRouter.get('/csrf', csrfToken);
apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/products', productRouter);
apiRouter.use('/categories', categoryRouter);
apiRouter.use('/cart', cartRouter);
apiRouter.use('/addresses', addressRouter);
apiRouter.use('/orders', orderRouter);
apiRouter.use('/payments', paymentRouter);
apiRouter.use('/admin/orders', adminOrderRouter);
apiRouter.use('/admin', adminRouter);
