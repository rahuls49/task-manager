import { CreateTaskDto, UpdateTaskDto, ValidationError, TaskValidationResult } from "./task.types";
import { VALIDATION_RULES, ERROR_MESSAGES, RECURRENCE_FREQUENCIES } from "./task.constants";

/**
 * Comprehensive task validation utility functions
 */

export class TaskValidator {
  
  /**
   * Validate task creation data
   */
  static async validateCreateTask(data: CreateTaskDto): Promise<TaskValidationResult> {
    const errors: ValidationError[] = [];

    // Title validation
    if (!data.title || data.title.trim().length === 0) {
      errors.push({
        field: 'title',
        message: ERROR_MESSAGES.TITLE_REQUIRED,
        code: 'TITLE_REQUIRED'
      });
    } else if (data.title.length > VALIDATION_RULES.TITLE_MAX_LENGTH) {
      errors.push({
        field: 'title',
        message: `Title cannot exceed ${VALIDATION_RULES.TITLE_MAX_LENGTH} characters`,
        code: 'TITLE_TOO_LONG'
      });
    }

    // Description validation
    if (data.description && data.description.length > VALIDATION_RULES.DESCRIPTION_MAX_LENGTH) {
      errors.push({
        field: 'description',
        message: `Description cannot exceed ${VALIDATION_RULES.DESCRIPTION_MAX_LENGTH} characters`,
        code: 'DESCRIPTION_TOO_LONG'
      });
    }

    // Due date validation
    if (data.dueDate) {
      const dueDateValidation = this.validateDueDate(data.dueDate);
      if (!dueDateValidation.isValid) {
        errors.push(...dueDateValidation.errors);
      }
    }

    // Due time validation
    if (data.dueTime) {
      const dueTimeValidation = this.validateDueTime(data.dueTime);
      if (!dueTimeValidation.isValid) {
        errors.push(...dueTimeValidation.errors);
      }
    }

    // Assignment validation
    if (data.assigneeIds) {
      const assigneeValidation = this.validateAssignees(data.assigneeIds);
      if (!assigneeValidation.isValid) {
        errors.push(...assigneeValidation.errors);
      }
    }

    // Group assignment validation
    if (data.groupIds) {
      const groupValidation = this.validateGroups(data.groupIds);
      if (!groupValidation.isValid) {
        errors.push(...groupValidation.errors);
      }
    }

    // Recurrence validation
    if (data.isRecurring && !data.recurrenceId) {
      errors.push({
        field: 'recurrenceId',
        message: 'Recurrence pattern is required for recurring tasks',
        code: 'RECURRENCE_REQUIRED'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate task update data
   */
  static async validateUpdateTask(data: UpdateTaskDto): Promise<TaskValidationResult> {
    const errors: ValidationError[] = [];

    // Title validation (if provided)
    if (data.title !== undefined) {
      if (!data.title || data.title.trim().length === 0) {
        errors.push({
          field: 'title',
          message: ERROR_MESSAGES.TITLE_REQUIRED,
          code: 'TITLE_REQUIRED'
        });
      } else if (data.title.length > VALIDATION_RULES.TITLE_MAX_LENGTH) {
        errors.push({
          field: 'title',
          message: `Title cannot exceed ${VALIDATION_RULES.TITLE_MAX_LENGTH} characters`,
          code: 'TITLE_TOO_LONG'
        });
      }
    }

    // Description validation (if provided)
    if (data.description !== undefined && data.description && 
        data.description.length > VALIDATION_RULES.DESCRIPTION_MAX_LENGTH) {
      errors.push({
        field: 'description',
        message: `Description cannot exceed ${VALIDATION_RULES.DESCRIPTION_MAX_LENGTH} characters`,
        code: 'DESCRIPTION_TOO_LONG'
      });
    }

    // Due date validation (if provided)
    if (data.dueDate !== undefined) {
      const dueDateValidation = this.validateDueDate(data.dueDate);
      if (!dueDateValidation.isValid) {
        errors.push(...dueDateValidation.errors);
      }
    }

    // Due time validation (if provided)
    if (data.dueTime !== undefined) {
      const dueTimeValidation = this.validateDueTime(data.dueTime);
      if (!dueTimeValidation.isValid) {
        errors.push(...dueTimeValidation.errors);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate due date
   */
  static validateDueDate(dueDate: string): TaskValidationResult {
    const errors: ValidationError[] = [];

    try {
      const date = new Date(dueDate);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        errors.push({
          field: 'dueDate',
          message: 'Invalid due date format',
          code: 'INVALID_DATE_FORMAT'
        });
      } else {
        // Check if date is in the past
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (date < today) {
          errors.push({
            field: 'dueDate',
            message: ERROR_MESSAGES.DUE_DATE_PAST,
            code: 'DUE_DATE_PAST'
          });
        }
      }
    } catch (error) {
      errors.push({
        field: 'dueDate',
        message: 'Invalid due date format',
        code: 'INVALID_DATE_FORMAT'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate due time
   */
  static validateDueTime(dueTime: string): TaskValidationResult {
    const errors: ValidationError[] = [];

    // Time format validation (HH:MM or HH:MM:SS)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
    
    if (!timeRegex.test(dueTime)) {
      errors.push({
        field: 'dueTime',
        message: 'Invalid time format. Use HH:MM or HH:MM:SS format',
        code: 'INVALID_TIME_FORMAT'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate assignee IDs
   */
  static validateAssignees(assigneeIds: number[]): TaskValidationResult {
    const errors: ValidationError[] = [];

    if (!Array.isArray(assigneeIds)) {
      errors.push({
        field: 'assigneeIds',
        message: 'Assignee IDs must be an array',
        code: 'INVALID_ASSIGNEE_FORMAT'
      });
      return { isValid: false, errors };
    }

    // Check for duplicate IDs
    const uniqueIds = new Set(assigneeIds);
    if (uniqueIds.size !== assigneeIds.length) {
      errors.push({
        field: 'assigneeIds',
        message: 'Duplicate assignee IDs found',
        code: 'DUPLICATE_ASSIGNEES'
      });
    }

    // Validate each ID is a positive number
    for (const id of assigneeIds) {
      if (!Number.isInteger(id) || id <= 0) {
        errors.push({
          field: 'assigneeIds',
          message: 'All assignee IDs must be positive integers',
          code: 'INVALID_ASSIGNEE_ID'
        });
        break;
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate group IDs
   */
  static validateGroups(groupIds: number[]): TaskValidationResult {
    const errors: ValidationError[] = [];

    if (!Array.isArray(groupIds)) {
      errors.push({
        field: 'groupIds',
        message: 'Group IDs must be an array',
        code: 'INVALID_GROUP_FORMAT'
      });
      return { isValid: false, errors };
    }

    // Check for duplicate IDs
    const uniqueIds = new Set(groupIds);
    if (uniqueIds.size !== groupIds.length) {
      errors.push({
        field: 'groupIds',
        message: 'Duplicate group IDs found',
        code: 'DUPLICATE_GROUPS'
      });
    }

    // Validate each ID is a positive number
    for (const id of groupIds) {
      if (!Number.isInteger(id) || id <= 0) {
        errors.push({
          field: 'groupIds',
          message: 'All group IDs must be positive integers',
          code: 'INVALID_GROUP_ID'
        });
        break;
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate recurrence pattern
   */
  static validateRecurrencePattern(
    frequency: string, 
    interval: number, 
    endDate?: string, 
    daysOfWeek?: string
  ): TaskValidationResult {
    const errors: ValidationError[] = [];

    // Validate frequency
    if (!RECURRENCE_FREQUENCIES.includes(frequency as any)) {
      errors.push({
        field: 'frequency',
        message: `Invalid frequency. Must be one of: ${RECURRENCE_FREQUENCIES.join(', ')}`,
        code: 'INVALID_FREQUENCY'
      });
    }

    // Validate interval
    if (!Number.isInteger(interval) || interval < 1 || interval > 365) {
      errors.push({
        field: 'interval',
        message: 'Interval must be a positive integer between 1 and 365',
        code: 'INVALID_INTERVAL'
      });
    }

    // Validate end date if provided
    if (endDate) {
      const endDateValidation = this.validateDueDate(endDate);
      if (!endDateValidation.isValid) {
        errors.push({
          field: 'endDate',
          message: 'Invalid end date',
          code: 'INVALID_END_DATE'
        });
      }
    }

    // Validate days of week for weekly frequency
    if (frequency === 'weekly' && daysOfWeek) {
      try {
        const days = JSON.parse(daysOfWeek);
        if (!Array.isArray(days) || days.length === 0) {
          errors.push({
            field: 'daysOfWeek',
            message: 'Days of week must be a non-empty array for weekly recurrence',
            code: 'INVALID_DAYS_OF_WEEK'
          });
        } else {
          const validDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          for (const day of days) {
            if (!validDays.includes(day.toLowerCase())) {
              errors.push({
                field: 'daysOfWeek',
                message: 'Invalid day of week',
                code: 'INVALID_DAY_NAME'
              });
              break;
            }
          }
        }
      } catch (error) {
        errors.push({
          field: 'daysOfWeek',
          message: 'Days of week must be valid JSON array',
          code: 'INVALID_DAYS_FORMAT'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): TaskValidationResult {
    const errors: ValidationError[] = [];
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
      errors.push({
        field: 'email',
        message: 'Invalid email format',
        code: 'INVALID_EMAIL_FORMAT'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate subtask relationships
   */
  static validateSubtaskRelationship(
    parentTaskId: number, 
    subtaskDueDate?: string, 
    parentTaskDueDate?: string
  ): TaskValidationResult {
    const errors: ValidationError[] = [];

    // Check subtask due date doesn't exceed parent due date
    if (subtaskDueDate && parentTaskDueDate) {
      const subtaskDue = new Date(subtaskDueDate);
      const parentDue = new Date(parentTaskDueDate);
      
      if (subtaskDue > parentDue) {
        errors.push({
          field: 'dueDate',
          message: ERROR_MESSAGES.SUBTASK_DUE_DATE_INVALID,
          code: 'SUBTASK_DUE_DATE_INVALID'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate task hierarchy depth
   */
  static validateTaskDepth(currentDepth: number): TaskValidationResult {
    const errors: ValidationError[] = [];

    if (currentDepth >= VALIDATION_RULES.MAX_SUBTASK_DEPTH) {
      errors.push({
        field: 'parentTaskId',
        message: `Maximum task hierarchy depth (${VALIDATION_RULES.MAX_SUBTASK_DEPTH}) exceeded`,
        code: 'MAX_DEPTH_EXCEEDED'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}