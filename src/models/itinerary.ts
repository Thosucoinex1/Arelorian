// Copyright 2024 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { DayPlan } from './day_plan';

export interface ItineraryData {
  place: string;
  itineraryName: string;
  startDate: string;
  endDate: string;
  tags: string[];
  itineraryImageUrl: string;
  placeRef: string;
  itinerary: Record<string, unknown>[];
}

export class Itinerary {
  dayPlans: DayPlan[];
  place: string;
  name: string;
  startDate: string;
  endDate: string;
  tags: string[];
  heroUrl: string;
  placeRef: string;

  constructor(
    dayPlans: DayPlan[],
    place: string,
    name: string,
    startDate: string,
    endDate: string,
    tags: string[],
    heroUrl: string,
    placeRef: string
  ) {
    this.dayPlans = dayPlans;
    this.place = place;
    this.name = name;
    this.startDate = startDate;
    this.endDate = endDate;
    this.tags = tags;
    this.heroUrl = heroUrl;
    this.placeRef = placeRef;
  }

  toString(): string {
    return `
      place: ${this.place},
      name: ${this.name},
      startDate: ${this.startDate},
      endDate: ${this.endDate},
      tags: ${JSON.stringify(this.tags)},
      heroUrl: ${this.heroUrl},
      placeRef: ${this.placeRef}
    `;
  }
}

export class ItineraryClient {
  private endpoint: string;

  constructor(backendEndpoint: string = process.env.REACT_APP_BACKEND_ENDPOINT || '') {
    this.endpoint = `${backendEndpoint}/itineraryGenerator2`;
  }

  async loadItinerariesFromServer(
    query: string,
    images?: string[]
  ): Promise<Itinerary[]> {
    const jsonBody = JSON.stringify({
      data: {
        request: query,
        ...(images && { images }),
      },
    });

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonBody,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();
      const allItineraries = this.parseItineraries(responseText);

      return allItineraries;
    } catch (e) {
      console.error("Couldn't get itineraries.", e);
      throw new Error("Couldn't get itineraries.");
    }
  }

  parseItineraries(jsonStr: string): Itinerary[] {
    try {
      const jsonData = JSON.parse(jsonStr);
      const itineraries: Itinerary[] = [];

      const itineraryList = jsonData.result.itineraries as ItineraryData[];
      for (const itineraryData of itineraryList) {
        const days: DayPlan[] = [];
        for (const dayData of itineraryData.itinerary) {
          const event = DayPlan.fromJson(dayData);
          days.push(event);
        }

        const itinerary = new Itinerary(
          days,
          itineraryData.place,
          itineraryData.itineraryName,
          itineraryData.startDate,
          itineraryData.endDate,
          itineraryData.tags,
          itineraryData.itineraryImageUrl,
          itineraryData.placeRef
        );
        itineraries.push(itinerary);
      }

      return itineraries;
    } catch (e) {
      console.error(`There was an error parsing the response:\n${jsonStr}`, e);
      throw new Error('There was an error parsing the response');
    }
  }
}

// Example usage
async function main() {
  const client = new ItineraryClient();
  try {
    const itineraries = await client.loadItinerariesFromServer(
      'I want a vacation at the beach with beautiful views and good food'
    );
    console.log(itineraries.toString());
  } catch (error) {
    console.error('Error loading itineraries:', error);
  }
}

// Uncomment to run
// main();