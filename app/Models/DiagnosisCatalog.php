<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Database\Factories\DiagnosisCatalogFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['code_system', 'code', 'display', 'search_terms', 'is_active'])]
class DiagnosisCatalog extends Model
{
    /** @use HasFactory<DiagnosisCatalogFactory> */
    use HasFactory, HasUuid;

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }
}
