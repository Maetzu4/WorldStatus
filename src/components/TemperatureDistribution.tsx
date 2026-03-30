"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface TemperatureBins {
  below0: number;
  from0to10: number;
  from10to20: number;
  from20to30: number;
  above30: number;
}

export default function TemperatureDistribution({
  bins,
}: {
  bins: TemperatureBins;
}) {
  const labels = ["< 0°C", "0–10°C", "10–20°C", "20–30°C", "30°C +"];
  const values = [
    bins.below0,
    bins.from0to10,
    bins.from10to20,
    bins.from20to30,
    bins.above30,
  ];

  const colors = [
    "rgba(56, 189, 248, 0.8)",   // sky-400
    "rgba(96, 165, 250, 0.8)",   // blue-400
    "rgba(52, 211, 153, 0.8)",   // emerald-400
    "rgba(251, 191, 36, 0.8)",   // amber-400
    "rgba(248, 113, 113, 0.8)",  // red-400
  ];

  const borderColors = [
    "rgba(56, 189, 248, 1)",
    "rgba(96, 165, 250, 1)",
    "rgba(52, 211, 153, 1)",
    "rgba(251, 191, 36, 1)",
    "rgba(248, 113, 113, 1)",
  ];

  const chartData = {
    labels,
    datasets: [
      {
        label: "Cities",
        data: values,
        backgroundColor: colors,
        borderColor: borderColors,
        borderWidth: 1,
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.9)",
        titleColor: "rgba(248, 250, 252, 1)",
        bodyColor: "rgba(203, 213, 225, 1)",
        borderColor: "rgba(51, 65, 85, 1)",
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label: function (context: any) {
            return `${context.parsed.y} ${context.parsed.y === 1 ? "city" : "cities"}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: "rgba(148, 163, 184, 1)",
          font: {
            size: 12,
            family: "'Inter', sans-serif",
            weight: 600 as const,
          },
        },
      },
      y: {
        grid: {
          color: "rgba(30, 41, 59, 0.5)",
        },
        ticks: {
          color: "rgba(148, 163, 184, 1)",
          font: {
            size: 11,
            family: "'Inter', sans-serif",
          },
          stepSize: 1,
        },
      },
    },
  };

  const totalCities = values.reduce((a, b) => a + b, 0);

  if (totalCities === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">
        Insufficient data for temperature distribution
      </div>
    );
  }

  return <Bar options={options} data={chartData} />;
}
