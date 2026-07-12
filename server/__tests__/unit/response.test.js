const { success, error } = require('../../lib/response');

let res;
beforeEach(() => {
  res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
});

describe('success', () => {
  it('sends 200 and { success: true, data: { foo: "bar" } } by default', () => {
    success(res, { foo: 'bar' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { foo: 'bar' } });
  });

  it('accepts a custom status code (201)', () => {
    success(res, {}, 201);
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe('error', () => {
  it('sends 400 with message and code', () => {
    error(res, 'Bad input', 400, 'VALIDATION_ERROR');
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Bad input',
      code: 'VALIDATION_ERROR',
    });
  });

  it('supports 500 server errors', () => {
    error(res, 'Server error', 500, 'SERVER_ERROR');
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('uses defaults statusCode=400 and code=GENERIC_ERROR when not provided', () => {
    error(res, 'msg');
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'msg',
      code: 'GENERIC_ERROR',
    });
  });
});
