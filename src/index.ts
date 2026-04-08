import { startServer } from './server.js';

/**
 * Entry point da aplicação
 * Inicia o servidor e trata erros não capturados
 */

// Trata erros não capturados
process.on('uncaughtException', (error) => {
	console.error('Uncaught Exception:', error);
	process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
	console.error('Unhandled Rejection at:', promise, 'reason:', reason);
	process.exit(1);
});

// Inicia o servidor
startServer().catch((error) => {
	console.error('Failed to start server:', error);
	process.exit(1);
});
