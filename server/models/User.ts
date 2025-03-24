import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';

export class User extends Model {
  public id!: string;
  public email!: string;
  public name!: string;
  public password!: string;
  public role!: string;
  public preferences!: any;
  public lastLogin!: Date;
  public createdAt!: Date;
  public updatedAt!: Date;
}

User.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('USER', 'ADMIN', 'SUPER_ADMIN'),
    defaultValue: 'USER',
  },
  preferences: {
    type: DataTypes.JSONB,
    defaultValue: {},
  },
  lastLogin: {
    type: DataTypes.DATE,
  },
}, {
  sequelize,
  modelName: 'User',
  tableName: 'users',
  timestamps: true,
});
