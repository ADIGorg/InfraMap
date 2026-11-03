export class AppError extends Error {
    public readonly statusCode: number;

    constructor(message: string, statusCode = 400) {
        super(message); // Passa a mensagem para a classe nativa Error

        this.name = 'AppError'; // Define o nome do erro para aparecer nos logs
        this.statusCode = statusCode;

        // Restaura a cadeia de protótipos para garantir que 'instanceof AppError' 
        // funcione corretamente em qualquer ambiente JavaScript.
        Object.setPrototypeOf(this, new.target.prototype);
    }
}