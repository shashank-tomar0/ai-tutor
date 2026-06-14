import { NextResponse } from 'next/server';

export async function GET() {
  const heatmap_data = [
    {"concept": "Fractions", "score": 85},
    {"concept": "Decimals", "score": 92},
    {"concept": "Algebra Basics", "score": 78},
    {"concept": "Geometry", "score": 65},
    {"concept": "Trigonometry", "score": 45}
  ];
  return NextResponse.json(heatmap_data);
}
