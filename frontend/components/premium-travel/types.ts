
export enum TripType {
  ONE_WAY = 'One-way',
  ROUND_TRIP = 'Round-trip'
}

export enum BookingCategory {
  INTERCITY = 'Intercity',
  AIRPORT = 'Airport Transfer'
}

export interface Vehicle {
  id: string;
  name: string;
  description: string;
  pricePerMile: number;
  capacity: number;
  luggage: number;
  amenities: string[];
  image: string;
}

export interface Recommendation {
  route: string;
  highlights: string[];
  estimatedTime: string;
  estimatedPrice: string;
}

export interface RideData {
  pickup: string;
  dropoff: string;
  date: string;
  persons: number;
  luggage: number;
}

export interface VehicleOption {
  id: string;
  name: string;
  model: string;
  baseFare: number;
  ratePerMile: number;
  seats: number;
  bags: number;
  img: string;
  tag?: string;
  desc: string;
  isBigCar?: boolean;
}

export interface SelectedVehicle extends VehicleOption {
  price: string;
  miles: number;
}
