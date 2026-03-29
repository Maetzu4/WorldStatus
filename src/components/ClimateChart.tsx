"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ChartDataPoints {
  time: string;
  temperature: number;
}

export default function ClimateChart({
  data,
}: {
  data: ChartDataPoints[];
}) {
  const chartData = {
    labels: data.map((d) => d.time),
    datasets: [
      {
        label: "Global Avg. Temperature (°C)",
        data: data.map((d) => d.temperature),
        borderColor: "rgba(59, 130, 246, 1)", // Blue 500
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        borderWidth: 2,
        pointBackgroundColor: "rgba(14, 165, 233, 1)", // Sky 500
        pointBorderColor: "rgba(15, 23, 42, 1)", // Slate 900
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.4,
        fill: true,
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
        backgroundColor: "rgba(15, 23, 42, 0.9)", // Slate 900
        titleColor: "rgba(248, 250, 252, 1)", // Slate 50
        bodyColor: "rgba(203, 213, 225, 1)", // Slate 300
        borderColor: "rgba(51, 65, 85, 1)", // Slate 700
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          label: function (context: any) {
            return `${context.parsed.y}°C`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
          drawBorder: false,
        },
        ticks: {
          color: "rgba(148, 163, 184, 1)", // Slate 400
          maxTicksLimit: 8,
          font: {
            size: 11,
            family: "'Inter', sans-serif",
          },
        },
      },
      y: {
        grid: {
          color: "rgba(30, 41, 59, 0.5)", // Slate 800 with opacity
          drawBorder: false,
        },
        ticks: {
          color: "rgba(148, 163, 184, 1)", // Slate 400
          font: {
            size: 11,
            family: "'Inter', sans-serif",
          },
          callback: function (value: any) {
            return value + "°";
          },
        },
      },
    },
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
  };

  if(!data.length) {
    return (
      <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">
        Insufficient data for historical trend
      </div>
    );
  }

  return <Line options={options} data={chartData} />;
}
