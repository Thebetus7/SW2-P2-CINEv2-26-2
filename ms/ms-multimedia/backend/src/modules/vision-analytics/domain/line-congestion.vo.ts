export type CongestionStatus = 'NORMAL' | 'CONGESTIONADA';

export class LineCongestionVO {
  public static readonly CONGESTION_THRESHOLD: number = 40;

  private readonly _personCount: number;
  private readonly _status: CongestionStatus;

  constructor(personCount: number) {
    if (!Number.isInteger(personCount) || personCount < 0) {
      throw new Error(`El conteo de personas debe ser un número entero no negativo. Recibido: ${personCount}`);
    }

    this._personCount = personCount;
    this._status = personCount > LineCongestionVO.CONGESTION_THRESHOLD ? 'CONGESTIONADA' : 'NORMAL';
  }

  public static of(personCount: number): LineCongestionVO {
    return new LineCongestionVO(personCount);
  }

  public get count(): number {
    return this._personCount;
  }

  public get status(): CongestionStatus {
    return this._status;
  }

  public get isCongested(): boolean {
    return this._status === 'CONGESTIONADA';
  }

  public get threshold(): number {
    return LineCongestionVO.CONGESTION_THRESHOLD;
  }

  public toJSON() {
    return {
      personCount: this._personCount,
      congestionStatus: this._status,
      isCongested: this.isCongested,
      threshold: this.threshold,
    };
  }
}
