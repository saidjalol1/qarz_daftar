from decimal import Decimal

from django.conf import settings
from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.db import models
from django.db.models import Sum


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, password, **extra):
        if not email:
            raise ValueError('Email kiritilishi shart.')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra):
        extra.setdefault('is_staff', False)
        extra.setdefault('is_superuser', False)
        extra.setdefault('role', User.Role.CASHIER)
        return self._create_user(email, password, **extra)

    def create_superuser(self, email, password=None, **extra):
        extra.setdefault('is_staff', True)
        extra.setdefault('is_superuser', True)
        extra.setdefault('role', User.Role.SUPER)
        extra.setdefault('is_active', True)
        if extra.get('is_staff') is not True:
            raise ValueError('Superuser is_staff=True bo‘lishi kerak.')
        if extra.get('is_superuser') is not True:
            raise ValueError('Superuser is_superuser=True bo‘lishi kerak.')
        return self._create_user(email, password, **extra)


class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        SUPER = 'super', 'Super'
        MANAGER = 'manager', 'Menejer'
        CASHIER = 'cashier', 'Kassir'

    email = models.EmailField(unique=True)
    name = models.CharField(max_length=150)
    phone = models.CharField(max_length=32)
    telegram = models.CharField(max_length=64, blank=True)
    role = models.CharField(max_length=16, choices=Role.choices, default=Role.MANAGER)
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['name']

    class Meta:
        verbose_name = 'foydalanuvchi'
        verbose_name_plural = 'foydalanuvchilar'
        ordering = ['name']

    def __str__(self):
        return self.name or self.email


class Client(models.Model):
    name = models.CharField(max_length=150, db_index=True)
    phone = models.CharField(max_length=32, db_index=True)
    telegram = models.CharField(max_length=64, blank=True)
    is_archived = models.BooleanField(default=False)  # Archive instead of delete if has debts
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'klient'
        verbose_name_plural = 'klientlar'
        ordering = ['name']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['phone']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return self.name


class Product(models.Model):
    name = models.CharField(max_length=150, db_index=True)
    is_archived = models.BooleanField(default=False)  # Archive instead of delete if used in debts
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'mahsulot'
        verbose_name_plural = 'mahsulotlar'
        ordering = ['name']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return self.name


class UsdRate(models.Model):
    rate = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('12500.00'))
    cbu_date = models.CharField(max_length=16, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'USD kursi'
        verbose_name_plural = 'USD kursi'

    def __str__(self):
        return f'1 USD = {self.rate} so‘m'

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def current(cls):
        obj, _ = cls.objects.get_or_create(pk=1, defaults={'rate': Decimal('12500.00')})
        return obj


class Debt(models.Model):
    class Currency(models.TextChoices):
        UZS = 'uzs', 'So‘m'
        USD = 'usd', 'USD'

    number = models.PositiveIntegerField(unique=True)
    client = models.ForeignKey(Client, on_delete=models.PROTECT, related_name='debts')
    issued_at = models.DateTimeField()
    manual = models.BooleanField(default=False)
    archived = models.BooleanField(default=False)
    archived_at = models.DateTimeField(null=True, blank=True)
    currency = models.CharField(max_length=3, choices=Currency.choices, default=Currency.UZS)
    total = models.DecimalField(max_digits=14, decimal_places=2)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='debts',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'qarz'
        verbose_name_plural = 'qarzlar'
        ordering = ['-issued_at', '-number']
        indexes = [
            models.Index(fields=['archived', '-issued_at']),
            models.Index(fields=['client', 'archived']),
        ]

    def __str__(self):
        return f'#{self.number} — {self.client}'

    @property
    def paid(self):
        return self.payments.aggregate(s=Sum('amount'))['s'] or Decimal('0')

    @property
    def left(self):
        return self.total - self.paid


class DebtItem(models.Model):
    debt = models.ForeignKey(Debt, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, null=True, blank=True, on_delete=models.SET_NULL, related_name='debt_items')
    name = models.CharField(max_length=150)
    price = models.DecimalField(max_digits=14, decimal_places=2)
    boxes = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0'))
    qty = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('1'))

    class Meta:
        verbose_name = 'qarz qatori'
        verbose_name_plural = 'qarz qatorlari'

    def __str__(self):
        return self.name

    @property
    def line_sum(self):
        return self.price * self.qty


class Payment(models.Model):
    debt = models.ForeignKey(Debt, on_delete=models.CASCADE, related_name='payments')
    paid_at = models.DateTimeField()
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'to‘lov'
        verbose_name_plural = 'to‘lovlar'
        ordering = ['paid_at']

    def __str__(self):
        return f'{self.amount} — #{self.debt.number}'
