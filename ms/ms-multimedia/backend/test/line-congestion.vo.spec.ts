import { LineCongestionVO } from '../src/modules/vision-analytics/domain/line-congestion.vo';

describe('LineCongestionVO (PLAN-02, RB-MEDIA-04)', () => {
  it('debe clasificar como NORMAL si hay 8 personas', () => {
    const vo = LineCongestionVO.of(8);
    expect(vo.count).toBe(8);
    expect(vo.status).toBe('NORMAL');
    expect(vo.isCongested).toBe(false);
  });

  it('debe clasificar como NORMAL en el límite exacto de 40 personas', () => {
    const vo = LineCongestionVO.of(40);
    expect(vo.count).toBe(40);
    expect(vo.status).toBe('NORMAL');
    expect(vo.isCongested).toBe(false);
  });

  it('debe clasificar como CONGESTIONADA si supera el umbral (>40 personas, ej. 45)', () => {
    const vo = LineCongestionVO.of(45);
    expect(vo.count).toBe(45);
    expect(vo.status).toBe('CONGESTIONADA');
    expect(vo.isCongested).toBe(true);
  });

  it('debe lanzar excepción ante valores negativos o con decimales', () => {
    expect(() => LineCongestionVO.of(-1)).toThrow('El conteo de personas debe ser un número entero no negativo');
    expect(() => LineCongestionVO.of(3.5)).toThrow('El conteo de personas debe ser un número entero no negativo');
  });
});
