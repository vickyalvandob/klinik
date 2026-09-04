<?php

namespace App;

enum EncounterStatus: string
{
    case Registered = 'registered';
    case WaitingTriage = 'waiting_triage';
    case WaitingDoctor = 'waiting_doctor';
    case InConsultation = 'in_consultation';
    case WaitingPharmacy = 'waiting_pharmacy';
    case WaitingPayment = 'waiting_payment';
    case Completed = 'completed';
    case Cancelled = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::Registered => 'Terdaftar',
            self::WaitingTriage => 'Menunggu pemeriksaan awal',
            self::WaitingDoctor => 'Menunggu dokter',
            self::InConsultation => 'Sedang diperiksa',
            self::WaitingPharmacy => 'Menunggu farmasi',
            self::WaitingPayment => 'Menunggu pembayaran',
            self::Completed => 'Selesai',
            self::Cancelled => 'Dibatalkan',
        };
    }

    public function tone(): string
    {
        return match ($this) {
            self::Registered => 'slate',
            self::WaitingTriage, self::WaitingDoctor => 'amber',
            self::InConsultation => 'blue',
            self::WaitingPharmacy, self::WaitingPayment => 'violet',
            self::Completed => 'emerald',
            self::Cancelled => 'red',
        };
    }

    /** @return list<self> */
    public function allowedTransitions(): array
    {
        return match ($this) {
            self::Registered => [self::WaitingTriage, self::WaitingDoctor, self::Cancelled],
            self::WaitingTriage => [self::WaitingDoctor, self::Cancelled],
            self::WaitingDoctor => [self::InConsultation, self::Cancelled],
            self::InConsultation => [self::WaitingPharmacy, self::WaitingPayment, self::Completed],
            self::WaitingPharmacy => [self::WaitingPayment, self::Completed],
            self::WaitingPayment => [self::Completed],
            self::Completed => [self::WaitingPayment],
            self::Cancelled => [],
        };
    }

    public function canTransitionTo(self $status): bool
    {
        return in_array($status, $this->allowedTransitions(), true);
    }

    public function canBeCancelled(): bool
    {
        return in_array(self::Cancelled, $this->allowedTransitions(), true);
    }
}
