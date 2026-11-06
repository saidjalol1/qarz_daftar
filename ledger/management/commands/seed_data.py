"""
Management command to seed initial data
"""
from django.core.management.base import BaseCommand
from ledger.models import User, Client, Product, UsdRate


class Command(BaseCommand):
    help = 'Seed database with initial data'

    def handle(self, *args, **options):
        self.stdout.write('Seeding database...')
        
        # Create superuser if not exists
        if not User.objects.filter(email='admin@qarzdaftar.uz').exists():
            user = User.objects.create_superuser(
                email='admin@qarzdaftar.uz',
                password='admin123',
                name='Super Admin',
                phone='+998901112233',
                telegram='superadmin'
            )
            self.stdout.write(self.style.SUCCESS(f'✓ Created superuser: {user.email}'))
        else:
            self.stdout.write(self.style.WARNING('✗ Superuser already exists'))
        
        # Create sample clients
        clients_data = [
            {'name': 'Aziz Karimov', 'phone': '+998901234567', 'telegram': 'aziz_k'},
            {'name': 'Dilnoza Yusupova', 'phone': '+998935554433', 'telegram': ''},
            {'name': 'Bobur Do\'stmatov', 'phone': '+998977001122', 'telegram': 'bobur_d'},
        ]
        
        created_clients = 0
        for client_data in clients_data:
            client, created = Client.objects.get_or_create(
                phone=client_data['phone'],
                defaults=client_data
            )
            if created:
                created_clients += 1
                self.stdout.write(self.style.SUCCESS(f'✓ Created client: {client.name}'))
        
        if created_clients == 0:
            self.stdout.write(self.style.WARNING('✗ Clients already exist'))
        
        # Create sample products
        products_data = [
            {'name': 'Un (Oliy nav)'},
            {'name': 'Yog\' 5 litr'},
            {'name': 'Shakar'},
        ]
        
        created_products = 0
        for product_data in products_data:
            product, created = Product.objects.get_or_create(
                name=product_data['name'],
                defaults=product_data
            )
            if created:
                created_products += 1
                self.stdout.write(self.style.SUCCESS(f'✓ Created product: {product.name}'))
        
        if created_products == 0:
            self.stdout.write(self.style.WARNING('✗ Products already exist'))
        
        # Initialize USD rate
        rate = UsdRate.current()
        self.stdout.write(self.style.SUCCESS(f'✓ USD rate initialized: {rate}'))
        
        self.stdout.write(self.style.SUCCESS('\n✅ Database seeded successfully!'))
        self.stdout.write('\nLogin credentials:')
        self.stdout.write('  Email: admin@qarzdaftar.uz')
        self.stdout.write('  Password: admin123')
