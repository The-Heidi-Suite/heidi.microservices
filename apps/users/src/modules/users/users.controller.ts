import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import {
  CreateUserDto,
  UpdateUserDto,
  RegisterDto,
  UpdateProfileDto,
  ChangePasswordDto,
  RegisterResponseDto,
  GetUsersResponseDto,
  GetUserResponseDto,
  CreateUserResponseDto,
  UpdateUserResponseDto,
  DeleteUserResponseDto,
  RestoreUserResponseDto,
  GetProfileResponseDto,
  UpdateProfileResponseDto,
  ChangePasswordResponseDto,
  ValidationErrorResponseDto,
  GuestValidationErrorResponseDto,
  ConflictErrorResponseDto,
  UnauthorizedErrorResponseDto,
  ForbiddenErrorResponseDto,
  NotFoundErrorResponseDto,
  BadRequestErrorResponseDto,
  CreateGuestDto,
  ConvertGuestDto,
  UploadProfilePhotoResponseDto,
  UserFilterDto,
  UserSortBy,
  UserSortDirection,
  RegisterDeviceDto,
  DeviceListResponseDto,
  RegisterDeviceResponseDto,
  DeleteDeviceResponseDto,
  SubscribeTopicDto,
  TopicSubscriptionListResponseDto,
  SubscribeTopicResponseDto,
  UnsubscribeTopicResponseDto,
  GetSalutationsResponseDto,
  UpdateNotificationPreferencesDto,
  GetNotificationPreferencesResponseDto,
  UpdateNotificationPreferencesResponseDto,
  UpdatePreferencesDto,
  UpdatePreferencesResponseDto,
} from '@heidi/contracts';
import { Public, GetCurrentUser, JwtAuthGuard } from '@heidi/jwt';
import { GetLanguage } from '@heidi/i18n';
import { AdminOnlyGuard, SuperAdminOnly } from '@heidi/rbac';
import { FileUploadService } from '@heidi/storage';
import { ConfigService } from '@heidi/config';
import { SuccessMessage } from '@heidi/interceptors';

@ApiTags('users')
@Controller()
@UseGuards(JwtAuthGuard, AdminOnlyGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly fileUploadService: FileUploadService,
    private readonly configService: ConfigService,
  ) {}

  @Get('salutations')
  @Public()
  @ApiOperation({
    summary: 'Get available salutations',
    description:
      'Retrieve list of available salutations (titles) in the specified language (public endpoint)',
  })
  @ApiQuery({
    name: 'locale',
    required: false,
    type: String,
    description: 'Language code (e.g., en, de, ar). Defaults to English if not provided.',
    example: 'en',
  })
  @ApiResponse({
    status: 200,
    description: 'Salutations retrieved successfully',
    type: GetSalutationsResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  async getSalutations(@Query('locale') locale?: string, @GetLanguage() language?: string) {
    const effectiveLocale = locale || language || 'en';
    return this.usersService.getSalutations(effectiveLocale);
  }

  @Post('register')
  @Public()
  @ApiOperation({
    summary: 'Register new user',
    description: 'Create a new user account (public endpoint)',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    type: RegisterResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation failed',
    type: ValidationErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'User already exists',
    type: ConflictErrorResponseDto,
  })
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto, @GetLanguage() language: string) {
    return this.usersService.register(dto, language);
  }

  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all users',
    description:
      'Retrieve a paginated, filterable, and sortable list of users (Admin only). By default, returns both active and deleted users. Use isActive=true to get only active users, or isActive=false to get only inactive/deleted users.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search term to filter users by email, username, first name, or last name',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description:
      'Filter by active status. Defaults to showing all users. Set to true for only active users, or false for only inactive/deleted users.',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: UserSortBy,
    description: 'Field to sort by',
  })
  @ApiQuery({
    name: 'sortDirection',
    required: false,
    enum: UserSortDirection,
    description: 'Sort direction (asc or desc)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of users retrieved successfully',
    type: GetUsersResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: UnauthorizedErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
    type: ForbiddenErrorResponseDto,
  })
  async findAll(@Query() filterDto: UserFilterDto) {
    // Debug: Log the received filterDto to see what's coming through
    return this.usersService.findAll(filterDto);
  }

  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get user by ID',
    description: 'Retrieve a specific user by their ID (Admin only)',
  })
  @ApiParam({ name: 'id', description: 'User ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
    type: GetUserResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    type: NotFoundErrorResponseDto,
  })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create user', description: 'Create a new user (Admin only)' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    type: CreateUserResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation failed',
    type: ValidationErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'User already exists',
    type: ConflictErrorResponseDto,
  })
  async create(@Body() dto: CreateUserDto, @GetLanguage() language: string) {
    return this.usersService.create(dto, language);
  }

  @Patch(':id')
  @ApiBearerAuth('JWT-auth')
  @SuccessMessage('USER_UPDATED')
  @ApiOperation({ summary: 'Update user', description: 'Update a user by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID (UUID)' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: UpdateUserResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    type: NotFoundErrorResponseDto,
  })
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete user', description: 'Delete a user by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'User deleted successfully',
    type: DeleteUserResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    type: NotFoundErrorResponseDto,
  })
  async delete(@Param('id') id: string) {
    return this.usersService.delete(id);
  }

  @Patch(':id/restore')
  @ApiBearerAuth('JWT-auth')
  @SuperAdminOnly()
  @ApiOperation({
    summary: 'Restore user',
    description: 'Restore a deleted/inactive user by ID (Super Admin only)',
  })
  @ApiParam({ name: 'id', description: 'User ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'User restored successfully',
    type: RestoreUserResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    type: NotFoundErrorResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'User is already active',
    type: BadRequestErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Super Admin access required',
    type: ForbiddenErrorResponseDto,
  })
  async restore(@Param('id') id: string) {
    return this.usersService.restore(id);
  }

  @Get('profile/me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get my profile',
    description: 'Get the current authenticated user profile',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile retrieved successfully',
    type: GetProfileResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: UnauthorizedErrorResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  async getProfile(@GetCurrentUser('userId') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Patch('profile/me')
  @ApiBearerAuth('JWT-auth')
  @SuccessMessage('PROFILE_UPDATED')
  @ApiOperation({
    summary: 'Update my profile',
    description: 'Update the current authenticated user profile',
  })
  @ApiBody({ type: UpdateProfileDto })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    type: UpdateProfileResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  async updateProfile(@GetCurrentUser('userId') userId: string, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Post('profile/photo')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Upload profile photo',
    description: 'Upload and process a profile photo for the current authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile photo uploaded successfully',
    type: UploadProfilePhotoResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file or validation failed',
    type: ValidationErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
    type: UnauthorizedErrorResponseDto,
  })
  async uploadProfilePhoto(
    @GetCurrentUser('userId') userId: string,
    @UploadedFile() file: any,
  ): Promise<UploadProfilePhotoResponseDto> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate image
    await this.fileUploadService.validateImage(file);

    // Process image (resize to 400x400, optimize)
    const processedFile = await this.fileUploadService.processProfilePhoto(file);

    // Get default bucket
    const bucket = this.configService.storageConfig.defaultBucket;
    if (!bucket) {
      throw new BadRequestException('Storage bucket is not configured');
    }

    // Generate storage key
    const key = this.fileUploadService.generateUserProfilePhotoKey(userId, processedFile.extension);

    // Upload to storage
    const photoUrl = await this.fileUploadService.uploadFile(processedFile, bucket, key);

    // Update user profile in database
    await this.usersService.updateProfile(userId, {
      profilePhotoUrl: photoUrl,
    });

    // Get full profile with city assignments
    const profileData = await this.usersService.getProfile(userId);

    // Transform profile data to match DTO structure
    const transformedProfileData = {
      id: profileData.id,
      email: profileData.email ?? '',
      username: profileData.username ?? '',
      firstName: profileData.firstName ?? '',
      lastName: profileData.lastName ?? '',
      salutationCode: profileData.salutationCode ?? undefined,
      role: profileData.role,
      hasVehicle: profileData.hasVehicle ?? false,
      isActive: profileData.isActive,
      createdAt:
        profileData.createdAt instanceof Date
          ? profileData.createdAt.toISOString()
          : profileData.createdAt,
      updatedAt:
        profileData.updatedAt instanceof Date
          ? profileData.updatedAt.toISOString()
          : profileData.updatedAt,
      cityAssignments: profileData.cityAssignments.map((assignment) => ({
        cityId: assignment.cityId,
        role: assignment.role,
        canManageAdmins: assignment.canManageAdmins,
        createdAt:
          assignment.createdAt instanceof Date
            ? assignment.createdAt.toISOString()
            : assignment.createdAt,
      })),
    };

    // Construct GetProfileResponseDto structure
    const profile: GetProfileResponseDto = {
      success: true,
      data: transformedProfileData,
      message: 'Profile photo uploaded successfully',
      timestamp: new Date().toISOString(),
      path: '/profile/photo',
      statusCode: 200,
    };

    return {
      profile,
      photoUrl,
    };
  }

  @Post('profile/me/change-password')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Change password',
    description: 'Change the password for the current authenticated user',
  })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
    type: ChangePasswordResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - current password incorrect',
    type: BadRequestErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: UnauthorizedErrorResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  async changePassword(@GetCurrentUser('userId') userId: string, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(userId, dto);
  }

  @Post('guest')
  @Public()
  @ApiOperation({
    summary: 'Create guest user (internal)',
    description:
      'Create a new guest user for mobile device (internal endpoint, typically called by auth service)',
  })
  @ApiBody({ type: CreateGuestDto })
  @ApiResponse({
    status: 201,
    description: 'Guest user created or retrieved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation failed',
    type: GuestValidationErrorResponseDto,
  })
  @HttpCode(HttpStatus.CREATED)
  async createGuest(@Body() dto: CreateGuestDto) {
    return this.usersService.createGuest(dto.deviceId, dto.devicePlatform, dto.deviceMetadata);
  }

  @Post('guest/convert')
  @Public()
  @ApiOperation({
    summary: 'Convert guest to registered user',
    description:
      'Convert a guest user account to a registered user account with automatic data migration',
  })
  @ApiBody({ type: ConvertGuestDto })
  @ApiResponse({
    status: 200,
    description: 'Guest user converted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation failed',
    type: ValidationErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Guest user not found',
    type: NotFoundErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Email or username already exists',
    type: ConflictErrorResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  async convertGuest(@Body() dto: ConvertGuestDto) {
    return this.usersService.convertGuestToUser(dto.guestUserId, {
      email: dto.email,
      username: dto.username,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
      cityId: dto.cityId,
    });
  }

  @Post('reset-password/request')
  @Public()
  @ApiOperation({
    summary: 'Request password reset',
    description: 'Request a password reset email to be sent',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' },
      },
      required: ['email'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent (if account exists)',
  })
  @HttpCode(HttpStatus.OK)
  async requestPasswordReset(@Body() body: { email: string }, @GetLanguage() language: string) {
    return this.usersService.requestPasswordReset(body.email, language);
  }

  @Post('reset-password/confirm')
  @Public()
  @ApiOperation({
    summary: 'Reset password',
    description: 'Reset password using the token from the email',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        token: { type: 'string' },
        newPassword: { type: 'string', minLength: 8 },
      },
      required: ['token', 'newPassword'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired token',
    type: BadRequestErrorResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() body: { token: string; newPassword: string },
    @GetLanguage() language: string,
  ) {
    return this.usersService.resetPassword(body.token, body.newPassword, language);
  }

  // Device Management Endpoints
  @Get('me/devices')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get my devices',
    description: 'Get all active devices for the current authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Devices retrieved successfully',
    type: DeviceListResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: UnauthorizedErrorResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  async getMyDevices(@GetCurrentUser('userId') userId: string) {
    const devices = await this.usersService.getDevices(userId);
    return { devices };
  }

  @Post('me/devices')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Register device',
    description: 'Register or update a device for the current authenticated user',
  })
  @ApiBody({ type: RegisterDeviceDto })
  @ApiResponse({
    status: 200,
    description: 'Device registered successfully',
    type: RegisterDeviceResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: UnauthorizedErrorResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  async registerDevice(@GetCurrentUser('userId') userId: string, @Body() dto: RegisterDeviceDto) {
    const device = await this.usersService.registerDevice(userId, dto);
    return { device };
  }

  @Delete('me/devices/:deviceId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete device',
    description: 'Deactivate a device for the current authenticated user',
  })
  @ApiParam({
    name: 'deviceId',
    description: 'Device ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Device deleted successfully',
    type: DeleteDeviceResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: UnauthorizedErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Device not found',
    type: NotFoundErrorResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  async deleteDevice(
    @GetCurrentUser('userId') userId: string,
    @Param('deviceId') deviceId: string,
  ) {
    return this.usersService.deleteDevice(userId, deviceId);
  }

  // Topic Subscription Endpoints
  @Get('me/topics')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get my topic subscriptions',
    description: 'Get all active topic subscriptions for the current authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Topic subscriptions retrieved successfully',
    type: TopicSubscriptionListResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: UnauthorizedErrorResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  async getMyTopicSubscriptions(@GetCurrentUser('userId') userId: string) {
    const subscriptions = await this.usersService.getTopicSubscriptions(userId);
    return { subscriptions };
  }

  @Post('me/topics')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Subscribe to topic',
    description: 'Subscribe the current authenticated user to a topic',
  })
  @ApiBody({ type: SubscribeTopicDto })
  @ApiResponse({
    status: 200,
    description: 'Topic subscription created successfully',
    type: SubscribeTopicResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: UnauthorizedErrorResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  async subscribeTopic(@GetCurrentUser('userId') userId: string, @Body() dto: SubscribeTopicDto) {
    const subscription = await this.usersService.subscribeTopic(userId, dto);
    return { subscription };
  }

  @Delete('me/topics/:topicKey')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Unsubscribe from topic',
    description: 'Unsubscribe the current authenticated user from a topic',
  })
  @ApiParam({
    name: 'topicKey',
    description: 'Topic key',
    example: 'CITY_123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Topic subscription removed successfully',
    type: UnsubscribeTopicResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: UnauthorizedErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Topic subscription not found',
    type: NotFoundErrorResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  async unsubscribeTopic(
    @GetCurrentUser('userId') userId: string,
    @Param('topicKey') topicKey: string,
  ) {
    return this.usersService.unsubscribeTopic(userId, topicKey);
  }

  // Notification Preferences Endpoint
  @Patch('me/notifications')
  @ApiBearerAuth('JWT-auth')
  @SuccessMessage('NOTIFICATION_PREFERENCES_UPDATED')
  @ApiOperation({
    summary: 'Update notification preferences',
    description:
      'Enable or disable push notifications for favorite event reminders. When disabled, the user will not receive Firebase notifications for upcoming favorite events.',
  })
  @ApiBody({ type: UpdateNotificationPreferencesDto })
  @ApiResponse({
    status: 200,
    description: 'Notification preferences updated successfully',
    type: UpdateNotificationPreferencesResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: UnauthorizedErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    type: NotFoundErrorResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  async updateNotificationPreferences(
    @GetCurrentUser('userId') userId: string,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return this.usersService.updateNotificationPreferences(userId, dto.notificationsEnabled);
  }

  @Get('me/notifications')
  @ApiBearerAuth('JWT-auth')
  @SuccessMessage('NOTIFICATION_PREFERENCES_RETRIEVED')
  @ApiOperation({
    summary: 'Get notification preferences',
    description: 'Get the current notification preferences for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification preferences retrieved successfully',
    type: GetNotificationPreferencesResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: UnauthorizedErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    type: NotFoundErrorResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  async getNotificationPreferences(@GetCurrentUser('userId') userId: string) {
    return this.usersService.getNotificationPreferences(userId);
  }

  // Preferences Endpoint (merged newsletter subscription and notification preferences)
  @Patch('me/preferences')
  @ApiBearerAuth('JWT-auth')
  @SuccessMessage('PREFERENCES_UPDATED')
  @ApiOperation({
    summary: 'Update user preferences',
    description:
      'Update newsletter subscription and/or notification preferences. Both fields are optional. Newsletter subscription uses JWT userId and email.',
  })
  @ApiBody({ type: UpdatePreferencesDto })
  @ApiResponse({
    status: 200,
    description: 'Preferences updated successfully',
    type: UpdatePreferencesResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: UnauthorizedErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    type: NotFoundErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'User is already subscribed to the newsletter',
    type: ConflictErrorResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  async updatePreferences(
    @GetCurrentUser('userId') userId: string,
    @GetCurrentUser('email') email: string,
    @Body() dto: UpdatePreferencesDto,
  ) {
    const result = await this.usersService.updatePreferences(userId, email, dto);
    return {
      success: true,
      data: {
        userId: result.userId,
        newsletterSubscription: result.newsletterSubscription,
        notificationsEnabled: result.notificationsEnabled,
        updatedAt: result.updatedAt,
      },
      message: 'Preferences updated successfully',
      timestamp: new Date().toISOString(),
      path: '/me/preferences',
      statusCode: 200,
    };
  }
}
