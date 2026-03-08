import { PricePoint } from '../types';

/**
 * Implements a Particle Filter (Sequential Importance Resampling).
 * Based on the formulas from the LUMIA Signal Processing Stack document.
 * Represents the posterior distribution with weighted particles, making no Gaussian assumption.
 */
export class ParticleFilter {
  private particles: { value: number; velocity: number }[];
  private weights: number[];
  private N: number; // Number of particles
  private processNoise: number;
  private observationNoise: number;

  constructor(initialValue: number, N: number = 500, processNoise: number = 0.5, observationNoise: number = 5) {
    this.N = N;
    this.processNoise = processNoise;
    this.observationNoise = observationNoise;
    this.particles = [];
    for (let i = 0; i < N; i++) {
      this.particles.push({ value: initialValue, velocity: 0 });
    }
    this.weights = new Array(N).fill(1 / N);
  }

  predict(): void {
    this.particles.forEach(p => {
      p.velocity += (Math.random() - 0.5) * this.processNoise * 0.1;
      p.value += p.velocity + (Math.random() - 0.5) * this.processNoise;
    });
  }

  update(z: number): void {
    let weightSum = 0;
    for (let i = 0; i < this.N; i++) {
      const error = z - this.particles[i].value;
      const likelihood = Math.exp(-0.5 * (error * error) / this.observationNoise);
      this.weights[i] *= likelihood;
      weightSum += this.weights[i];
    }

    // Normalize weights
    if (weightSum > 0) {
      for (let i = 0; i < this.N; i++) {
        this.weights[i] /= weightSum;
      }
    } else {
      this.weights.fill(1 / this.N);
    }

    this.resampleIfNeeded();
  }

  private resampleIfNeeded(): void {
    const ess = 1 / this.weights.reduce((sum, w) => sum + w * w, 0);
    if (ess < this.N / 2) {
      const newParticles = [];
      const cdf = new Array(this.N).fill(0);
      cdf[0] = this.weights[0];
      for (let i = 1; i < this.N; i++) {
        cdf[i] = cdf[i - 1] + this.weights[i];
      }

      for (let i = 0; i < this.N; i++) {
        const random = Math.random();
        let j = 0;
        while (cdf[j] < random) {
          j++;
        }
        newParticles.push({ ...this.particles[j] });
      }
      this.particles = newParticles;
      this.weights.fill(1 / this.N);
    }
  }

  getState(): { value: number } {
    let value = 0;
    for (let i = 0; i < this.N; i++) {
      value += this.particles[i].value * this.weights[i];
    }
    return { value };
  }
}

export const applyParticleFilter = (data: PricePoint[]): PricePoint[] => {
  if (data.length === 0) return [];
  const pf = new ParticleFilter(data[0].price);
  return data.map(point => {
    pf.predict();
    pf.update(point.price);
    return { date: point.date, price: pf.getState().value };
  });
};
