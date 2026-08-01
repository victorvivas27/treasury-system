import { HomeCallToAction } from "./components/HomeCallToAction";
import { HomeFeatures } from "./components/HomeFeatures";
import { HomeFooter } from "./components/HomeFooter";
import { HomeHeader } from "./components/HomeHeader";
import { HomeHero } from "./components/HomeHero";
import { useHomeReveal } from "./hooks/useHomeReveal";
import "./style/HomePage.css";

export const HomePage = () => {
  useHomeReveal();

  return (
    <div className="public-home">
      <HomeHeader />
      <main>
        <HomeHero />
        <HomeFeatures />
        <HomeCallToAction />
      </main>
      <HomeFooter />
    </div>
  );
};
