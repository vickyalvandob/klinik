<?php

namespace Database\Factories;

use App\Models\Medicine;
use App\Models\Prescription;
use App\Models\PrescriptionItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PrescriptionItem>
 */
class PrescriptionItemFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $prescription = Prescription::factory()->create();
        $medicine = Medicine::factory()->create([
            'tenant_id' => $prescription->tenant_id,
            'clinic_id' => $prescription->clinic_id,
        ]);

        return [
            'tenant_id' => $prescription->tenant_id,
            'clinic_id' => $prescription->clinic_id,
            'prescription_id' => $prescription->id,
            'medicine_id' => $medicine->id,
            'medicine_name_snapshot' => $medicine->name,
            'strength_snapshot' => $medicine->strength,
            'dosage_form_snapshot' => $medicine->dosage_form,
            'quantity' => 10,
            'unit' => $medicine->unit,
            'dose_text' => '1 tablet',
            'frequency_text' => '3 kali sehari',
            'instruction' => 'Minum sesuai petunjuk dokter.',
        ];
    }
}
