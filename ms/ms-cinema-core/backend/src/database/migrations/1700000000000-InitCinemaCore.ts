import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class InitCinemaCore1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. cinema_halls
    await queryRunner.createTable(
      new Table({
        name: 'cinema_halls',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, isGenerated: true, generationStrategy: 'uuid' },
          { name: 'name', type: 'varchar', length: '80', isUnique: true, isNullable: false },
          { name: 'total_rows', type: 'int', isNullable: false },
          { name: 'columns_per_row', type: 'int', isNullable: false },
          { name: 'total_capacity', type: 'int', isNullable: false },
          { name: 'projection_type', type: 'varchar', length: '20', isNullable: false },
          { name: 'status', type: 'varchar', length: '20', default: "'ACTIVA'" },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    // 2. seats
    await queryRunner.createTable(
      new Table({
        name: 'seats',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, isGenerated: true, generationStrategy: 'uuid' },
          { name: 'hall_id', type: 'uuid', isNullable: false },
          { name: 'row_letter', type: 'varchar', length: '2', isNullable: false },
          { name: 'seat_number', type: 'int', isNullable: false },
          { name: 'visible_code', type: 'varchar', length: '10', isNullable: false },
          { name: 'seat_type', type: 'varchar', length: '30', default: "'ESTANDAR'" },
          { name: 'is_active', type: 'boolean', default: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'seats',
      new TableForeignKey({
        columnNames: ['hall_id'],
        referencedTableName: 'cinema_halls',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'seats',
      new TableIndex({
        name: 'idx_seats_hall_row_col',
        columnNames: ['hall_id', 'row_letter', 'seat_number'],
        isUnique: true,
      }),
    );

    // 3. movies
    await queryRunner.createTable(
      new Table({
        name: 'movies',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, isGenerated: true, generationStrategy: 'uuid' },
          { name: 'title', type: 'varchar', length: '150', isNullable: false },
          { name: 'synopsis', type: 'text', isNullable: true },
          { name: 'duration_minutes', type: 'int', isNullable: false },
          { name: 'rating', type: 'varchar', length: '10', default: "'PG-13'" },
          { name: 'genre', type: 'varchar', length: '50', isNullable: true },
          { name: 'poster_url', type: 'varchar', length: '255', isNullable: true },
          { name: 'status', type: 'varchar', length: '20', default: "'EN_CARTELERA'" },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    // 4. showtimes
    await queryRunner.createTable(
      new Table({
        name: 'showtimes',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, isGenerated: true, generationStrategy: 'uuid' },
          { name: 'movie_id', type: 'uuid', isNullable: false },
          { name: 'hall_id', type: 'uuid', isNullable: false },
          { name: 'start_time', type: 'timestamp', isNullable: false },
          { name: 'end_time', type: 'timestamp', isNullable: false },
          { name: 'base_price', type: 'decimal', precision: 10, scale: 2, default: 45.00 },
          { name: 'status', type: 'varchar', length: '20', default: "'PROGRAMADA'" },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'showtimes',
      new TableForeignKey({
        columnNames: ['movie_id'],
        referencedTableName: 'movies',
        referencedColumnNames: ['id'],
      }),
    );

    await queryRunner.createForeignKey(
      'showtimes',
      new TableForeignKey({
        columnNames: ['hall_id'],
        referencedTableName: 'cinema_halls',
        referencedColumnNames: ['id'],
      }),
    );

    await queryRunner.createIndex(
      'showtimes',
      new TableIndex({
        name: 'idx_showtimes_hall_time',
        columnNames: ['hall_id', 'start_time', 'end_time'],
      }),
    );

    // 5. showtime_seats
    await queryRunner.createTable(
      new Table({
        name: 'showtime_seats',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, isGenerated: true, generationStrategy: 'uuid' },
          { name: 'showtime_id', type: 'uuid', isNullable: false },
          { name: 'seat_id', type: 'uuid', isNullable: false },
          { name: 'status', type: 'varchar', length: '25', default: "'DISPONIBLE'" },
          { name: 'locked_until', type: 'timestamp', isNullable: true },
          { name: 'locked_by_ticket_id', type: 'uuid', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'showtime_seats',
      new TableForeignKey({
        columnNames: ['showtime_id'],
        referencedTableName: 'showtimes',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'showtime_seats',
      new TableForeignKey({
        columnNames: ['seat_id'],
        referencedTableName: 'seats',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'showtime_seats',
      new TableIndex({
        name: 'idx_showtime_seat_unique',
        columnNames: ['showtime_id', 'seat_id'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('showtime_seats', true);
    await queryRunner.dropTable('showtimes', true);
    await queryRunner.dropTable('movies', true);
    await queryRunner.dropTable('seats', true);
    await queryRunner.dropTable('cinema_halls', true);
  }
}
