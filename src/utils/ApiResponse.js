class ApiResponse {
    constructor(statusCode, message, data = null) {
        this.statusCode = statusCode;
        this.message = message;
        this.success = statusCode >= 200 && statusCode < 300; // success is true for 2xx status codes
        if (data !== null) {
            this.data = data;
        }
    }
}

export default ApiResponse;