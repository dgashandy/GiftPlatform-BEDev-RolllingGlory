import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface JsonApiResponse<T> {
    data: T;
    meta?: {
        page?: number;
        limit?: number;
        total?: number;
        totalPages?: number;
    };
    links?: {
        self?: string;
        next?: string | null;
        prev?: string | null;
    };
}

@Injectable()
export class JsonApiInterceptor<T> implements NestInterceptor<T, JsonApiResponse<T>> {
    intercept(context: ExecutionContext, next: CallHandler): Observable<JsonApiResponse<T>> {
        const request = context.switchToHttp().getRequest();
        const url = request.url;

        return next.handle().pipe(
            map((response) => {
                if (response && typeof response === 'object' && 'data' in response) {
                    return response;
                }

                return {
                    data: response,
                    links: {
                        self: url,
                    },
                };
            }),
        );
    }
}
