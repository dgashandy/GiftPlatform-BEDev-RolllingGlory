import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';
        let errors: any[] = [];

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();

            if (typeof exceptionResponse === 'string') {
                message = exceptionResponse;
            } else if (typeof exceptionResponse === 'object') {
                const resp = exceptionResponse as any;
                message = resp.message || message;
                errors = resp.errors || [];

                if (Array.isArray(resp.message)) {
                    errors = resp.message;
                    message = 'Validation failed';
                }
            }
        } else if (exception instanceof Error) {
            message = exception.message;
        }

        response.status(status).json({
            errors: [
                {
                    status: status.toString(),
                    title: HttpStatus[status] || 'Error',
                    detail: message,
                    meta: errors.length > 0 ? { validationErrors: errors } : undefined,
                },
            ],
            meta: {
                timestamp: new Date().toISOString(),
                path: request.url,
            },
        });
    }
}
