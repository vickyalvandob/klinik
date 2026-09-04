<?php

namespace Database\Factories;

use App\Models\DiagnosisCatalog;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DiagnosisCatalog>
 */
class DiagnosisCatalogFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'code_system' => 'ICD-10',
            'code' => fake()->unique()->bothify('?##.#'),
            'display' => fake()->unique()->sentence(4),
            'search_terms' => fake()->words(3, true),
            'is_active' => true,
        ];
    }
}
