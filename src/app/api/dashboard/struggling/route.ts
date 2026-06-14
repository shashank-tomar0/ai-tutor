import { NextResponse } from 'next/server';

export async function GET() {
  const struggling_data = [
    {
      "student_name": "Alice Smith",
      "concept": "Trigonometry",
      "struggle": "Having trouble with SOH CAH TOA application.",
      "breakthrough": "Realized that Opposite is always relative to the angle."
    },
    {
      "student_name": "Bobby Tables",
      "concept": "Geometry",
      "struggle": "Confusing Area with Perimeter.",
      "breakthrough": null
    }
  ];
  return NextResponse.json(struggling_data);
}
