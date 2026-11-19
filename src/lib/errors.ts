export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = "Dữ liệu yêu cầu không hợp lệ.") {
    super(message, 400);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Không tìm thấy tài nguyên yêu cầu.") {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(
    message: string = "Khung giờ này vừa có khách khác đặt trước, vui lòng chọn khung giờ khác!"
  ) {
    super(message, 409);
  }
}
