"use client";

import { Ear, Bone, Wind, Heart, ChevronLeft } from "lucide-react";

export type DiseaseCategory = "ear" | "joint" | "lung" | "heart" | null;

interface Step1CategoryProps {
  selectedCategory: DiseaseCategory;
  onSelect: (category: DiseaseCategory) => void;
  onPrev: () => void;
  onNext: () => void;
}

const categories = [
  {
    id: "ear" as const,
    icon: Ear,
    emoji: "🦻",
    title: "귀",
    subtitle: "이명, 난청",
  },
  {
    id: "joint" as const,
    icon: Bone,
    emoji: "🦴",
    title: "관절/허리",
    subtitle: "디스크 등",
  },
  {
    id: "lung" as const,
    icon: Wind,
    emoji: "🫁",
    title: "폐/호흡기",
    subtitle: "숨참, 진폐",
  },
  {
    id: "heart" as const,
    icon: Heart,
    emoji: "🫀",
    title: "뇌/심장",
    subtitle: "과로, 뇌출혈",
  },
];

export function Step1Category({
  selectedCategory,
  onSelect,
  onPrev,
  onNext,
}: Step1CategoryProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-primary px-6 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onPrev}
            className="text-white p-2 -ml-2 active:opacity-70"
            aria-label="이전으로"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <span className="text-white text-lg font-medium">1 / 6</span>
          <div className="w-12" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 py-8 flex flex-col">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          현재 가장 불편하신 곳이
          <br />
          어디인가요?
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          해당하는 부위를 선택해 주세요.
        </p>

        {/* Category Cards */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {categories.map((category) => {
            const isSelected = selectedCategory === category.id;
            return (
              <button
                key={category.id}
                onClick={() => onSelect(category.id)}
                className={`
                  p-6 rounded-2xl border-3 transition-all text-left
                  active:scale-[0.98]
                  ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border bg-white hover:border-primary/50"
                  }
                `}
              >
                <span className="text-4xl mb-3 block">{category.emoji}</span>
                <h3 className="text-xl font-bold text-foreground mb-1">
                  {category.title}
                </h3>
                <p className="text-base text-muted-foreground">
                  {category.subtitle}
                </p>
              </button>
            );
          })}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Next Button */}
        <button
          onClick={onNext}
          disabled={!selectedCategory}
          className={`
            w-full text-xl font-bold py-5 rounded-2xl transition-all
            ${
              selectedCategory
                ? "bg-primary text-white active:scale-[0.98]"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }
          `}
        >
          다음
        </button>
      </main>
    </div>
  );
}
